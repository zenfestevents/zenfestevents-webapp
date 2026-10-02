// Server-only: Zenfest AI conversation storage. A chat is opened with a random token
// kept in the customer's browser; only its scrypt hash is stored (same scheme as the
// registry manage key).
import type OpenAI from 'openai'
import { createHash, randomBytes } from 'node:crypto'

import type { AiConversation } from '../../payload-types'
import { getPayloadClient } from '../payload'
import { hashSecret, verifySecret } from '../registry'
import { dailyCapUsd, emptyUsage, type UsageTotals } from './config'
import type { IntakeDetails } from './intake'
import type { EventBrief } from './specialist'
import type { ChatItem, SpecialistCard } from './types'

export type ConversationState = {
  id: string
  /** OpenAI-style chat history (without the system prompt), only ever appended to. */
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  transcript: ChatItem[]
  /** Event basics: the intake form's answers, then whatever the AI learns in the chat. */
  brief: Partial<EventBrief> & {
    intake?: IntakeDetails
    intakeRows?: [string, string][]
    /** Details saved during the chat (save_event_details): budget, theme, venueType, other. */
    extra?: Record<string, string>
  }
  specialistResults: Record<string, SpecialistCard>
  usage: UsageTotals
  turns: number
  status: NonNullable<AiConversation['status']>
  leadId: string | null
  leadNotified: boolean
}

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const asObject = <T extends object>(v: unknown): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : ({} as T))

function toState(doc: AiConversation): ConversationState {
  const lead = doc.lead
  return {
    id: String(doc.id),
    messages: asArray(doc.messages),
    transcript: asArray(doc.transcript),
    brief: asObject(doc.brief),
    specialistResults: asObject(doc.specialistResults),
    usage: {
      inputTokens: doc.usage?.inputTokens ?? 0,
      outputTokens: doc.usage?.outputTokens ?? 0,
      cacheReadTokens: doc.usage?.cacheReadTokens ?? 0,
      costUsd: doc.usage?.costUsd ?? 0,
    },
    turns: doc.turns ?? 0,
    status: doc.status ?? 'active',
    leadId: lead == null ? null : String(typeof lead === 'object' ? lead.id : lead),
    leadNotified: Boolean(doc.leadNotified),
  }
}

export const hashIp = (ip: string) => createHash('sha256').update(`zenfest-ai:${ip}`).digest('hex').slice(0, 32)

export async function createConversation(title: string, ip: string): Promise<{ state: ConversationState; token: string }> {
  const payload = await getPayloadClient()
  const token = randomBytes(24).toString('base64url')
  const doc = await payload.create({
    collection: 'ai-conversations',
    data: {
      title: title.slice(0, 120),
      tokenHash: hashSecret(token),
      ipHash: hashIp(ip),
      messages: [],
      transcript: [],
      brief: {},
      specialistResults: {},
      usage: emptyUsage(),
      turns: 0,
      status: 'active',
    },
  })
  return { state: toState(doc), token }
}

/** The conversation, only when `token` matches. */
export async function loadConversation(id: unknown, token: unknown): Promise<ConversationState | null> {
  if (typeof id !== 'string' && typeof id !== 'number') return null
  if (typeof token !== 'string' || !token) return null
  const payload = await getPayloadClient()
  try {
    const doc = await payload.findByID({ collection: 'ai-conversations', id: String(id), depth: 0 })
    if (!doc || !verifySecret(token, doc.tokenHash)) return null
    return toState(doc)
  } catch {
    return null
  }
}

export async function saveConversation(state: ConversationState): Promise<void> {
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'ai-conversations',
    id: state.id,
    data: {
      messages: state.messages as unknown as AiConversation['messages'],
      transcript: state.transcript as unknown as AiConversation['transcript'],
      brief: state.brief,
      specialistResults: state.specialistResults as unknown as AiConversation['specialistResults'],
      usage: state.usage,
      turns: state.turns,
      status: state.status,
      leadNotified: state.leadNotified,
    },
  })
}

/** Start of today in India (UTC+5:30), as an ISO string. */
function startOfTodayIST(): string {
  const offset = 330 * 60 * 1000
  const now = new Date(Date.now() + offset)
  now.setUTCHours(0, 0, 0, 0)
  return new Date(now.getTime() - offset).toISOString()
}

/**
 * Whether today's AI spend has reached ZENFEST_AI_DAILY_USD_CAP. Summed from the
 * database, so it holds across serverless instances. A chat that began yesterday
 * and continued today counts in full (errs on the safe side).
 */
export async function overDailyCap(): Promise<boolean> {
  const cap = dailyCapUsd()
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'ai-conversations',
    where: { updatedAt: { greater_than_equal: startOfTodayIST() } },
    depth: 0,
    pagination: false,
    select: { usage: true },
  })
  const spent = res.docs.reduce((sum, d) => sum + (d.usage?.costUsd ?? 0), 0)
  return spent >= cap
}

/** A readable plan for the lead, built from the brief and the specialists' cards. */
export function planSummary(state: ConversationState): string {
  const b = state.brief
  const lines: string[] = []
  if (b.intakeRows?.length) {
    lines.push('From the intake form:')
    for (const [k, v] of b.intakeRows) if (k !== 'Name' && k !== 'Phone') lines.push(`  ${k}: ${v}`)
    lines.push('', 'Gathered in the chat:')
  }
  lines.push(
    `Event: ${b.eventType ?? '-'}`,
    `Date: ${b.eventDate ?? '-'}`,
    `Area: ${b.area ?? '-'}`,
    `Guests: ${b.guestCount ?? '-'}`,
    `Budget: ${b.budget ?? '-'}`,
    ...Object.entries(b.extra ?? {})
      .filter(([k, v]) => k !== 'budget' && v)
      .map(([k, v]) => `${k === 'venueType' ? 'Venue' : k === 'theme' ? 'Theme' : 'Other'}: ${v}`),
    '',
  )
  let min = 0
  let max = 0
  for (const card of Object.values(state.specialistResults)) {
    lines.push(`${card.agentName}: ${card.summary}`)
    for (const p of card.picks) {
      const price = p.min == null ? 'price on request' : `₹${p.min.toLocaleString('en-IN')}–₹${(p.max ?? p.min).toLocaleString('en-IN')}`
      lines.push(`  • ${p.name} × ${p.qty} (${p.unit}) — ${price}`)
    }
    if (card.notes) lines.push(`  Note: ${card.notes}`)
    if (card.estimate) {
      min += card.estimate.min
      max += card.estimate.max
    }
  }
  if (max > 0) lines.push('', `Estimated total shown to customer: ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}`)
  // The customer's own words, so the team has context even if the AI never ran
  // (daily cap, turn limit) or missed something.
  const said = state.transcript.filter((i) => i.kind === 'user').map((i) => (i.kind === 'user' ? i.text : ''))
  if (said.length) {
    lines.push('', 'Customer wrote:')
    for (const t of said.slice(0, 8)) lines.push(`  “${t.length > 300 ? `${t.slice(0, 300)}…` : t}”`)
    if (said.length > 8) lines.push(`  …and ${said.length - 8} more messages (see the AI chat).`)
  }
  return lines.join('\n')
}

const LEAD_EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'housewarming', 'sports'] as const

/** Maps the AI's free-text event type onto the Leads select, or 'other'. */
export function leadEventType(raw: unknown): (typeof LEAD_EVENT_TYPES)[number] | 'other' | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const s = raw.toLowerCase()
  if (/marriage|wedding|kalyan|engagement|reception|nichay/.test(s)) return 'wedding'
  if (/house|griha|gruha/.test(s)) return 'housewarming'
  return LEAD_EVENT_TYPES.find((t) => s.includes(t)) ?? 'other'
}

/** Keeps a saved lead's plan current when the chat goes on after the customer left their number. */
export async function refreshLeadPlan(state: ConversationState): Promise<void> {
  if (!state.leadId) return
  const payload = await getPayloadClient()
  await payload.update({ collection: 'leads', id: state.leadId, data: { aiPlan: planSummary(state) } })
}

let noteSeq = 0
export const transcriptId = () => `${Date.now().toString(36)}-n${(noteSeq++).toString(36)}`
