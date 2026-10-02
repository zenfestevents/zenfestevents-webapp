'use server'

// Zenfest AI Server Actions: the intake form (opens a chat and saves the Lead the team
// calls back), the contact card, and restoring a chat after a reload. Each re-checks
// the conversation token.
import {
  createConversation,
  leadEventType,
  loadConversation,
  planSummary,
  saveConversation,
  transcriptId,
} from '../../../lib/ai/conversation'
import { AI_LIMITS } from '../../../lib/ai/config'
import { chatTitle, intakeRows, isWeddingType, parseIntake, whenLine } from '../../../lib/ai/intake'
import { loadSpecialists } from '../../../lib/ai/knowledge'
import { aiAvailable } from '../../../lib/ai/status'
import type { ChatItem } from '../../../lib/ai/types'
import { getSiteSettings } from '../../../lib/getSettings'
import { getPayloadClient } from '../../../lib/payload'
import { normalizePhone } from '../../../lib/phoneVerification'
import { clientIp, rateLimited } from '../../../lib/rateLimit'

type Fail = { ok: false; error: string }

/**
 * The intake form: validates the answers, opens a conversation with them as its brief
 * and saves the Lead right away (the team is notified even if the customer leaves).
 * The client then asks POST /plan/chat to "kick off" Zenfest's first reply.
 * When customer accounts arrive, name/phone can come from the profile instead.
 */
export async function startChat(
  input: unknown,
): Promise<{ ok: true; conversationId: string; token: string; title: string; items: ChatItem[] } | Fail> {
  try {
    const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
    if (typeof raw.company === 'string' && raw.company.trim()) return { ok: false, error: 'Please try again.' }
    if (!aiAvailable(await getSiteSettings())) return { ok: false, error: 'Zenfest AI is switched off right now.' }
    if (raw.consent !== true) return { ok: false, error: 'Please tick the box so our team may call you.' }

    const specialists = await loadSpecialists()
    const parsed = parseIntake(raw, specialists.map((s) => s.slug))
    if (!parsed.ok) return parsed
    const phone = normalizePhone(parsed.data.phone)
    if (!phone) return { ok: false, error: 'Enter a valid 10-digit mobile number.' }
    const intake = { ...parsed.data, phone }

    if (await rateLimited('ai-new', AI_LIMITS.newChatsPerHour, 60 * 60 * 1000)) {
      return { ok: false, error: 'Too many new chats from this connection. Please try again later.' }
    }

    const names = Object.fromEntries(specialists.map((s) => [s.slug, s.agentName.replace(/^Zenfest\s+/i, '') + ` (${s.service})`]))
    const rows = intakeRows(intake, names)
    const title = chatTitle(intake)
    const { state, token } = await createConversation(`${intake.name} — ${title}`, await clientIp())
    state.brief = {
      intake,
      intakeRows: rows,
      eventType: rows[0][1],
      eventDate: whenLine(intake),
      area: intake.area,
      guestCount: intake.guests,
    }
    const card: ChatItem = { kind: 'intake', id: transcriptId(), rows }
    state.transcript.push(card)

    // The lead's date only when an exact one is known: the muhurtham's, else the first
    // fixed function's / the event's. Months always appear in the message rows.
    const dated = isWeddingType(intake.eventType)
      ? (intake.functions.find((f) => f.name.startsWith('Muhurtham') && f.date) ?? intake.functions.find((f) => f.date))?.date
      : intake.event.date
    const payload = await getPayloadClient()
    const lead = await payload.create({
      collection: 'leads',
      data: {
        name: intake.name,
        phone,
        eventType: leadEventType(intake.eventType === 'baby-shower' ? 'other' : intake.eventType),
        eventDate: dated || undefined,
        message: [
          'Started a Zenfest AI chat.',
          ...rows.filter(([k]) => k !== 'Name' && k !== 'Phone').map(([k, v]) => `${k}: ${v}`),
        ].join('\n'),
        aiPlan: planSummary(state),
        source: 'zenfest-ai',
      },
    })
    state.leadId = String(lead.id)
    state.status = 'lead'
    // Zenfest's kickoff message says the details are shared, so no extra note is needed.
    state.leadNotified = true
    await saveConversation(state)
    await payload.update({ collection: 'ai-conversations', id: state.id, data: { lead: lead.id } })

    return { ok: true, conversationId: state.id, token, title, items: state.transcript }
  } catch (err) {
    console.error('[zenfest-ai] startChat failed:', err instanceof Error ? err.message : err)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function loadChat(conversationId: string, token: string): Promise<{ ok: true; items: ChatItem[] } | Fail> {
  const state = await loadConversation(conversationId, token)
  if (!state) return { ok: false, error: 'Chat not found.' }
  return { ok: true, items: state.transcript }
}

export type ContactInput = {
  conversationId: string
  token: string
  name: string
  phone: string
  consent: boolean
  company?: string // honeypot
}

export async function submitContact(input: ContactInput): Promise<{ ok: true; message: string } | Fail> {
  try {
    if (typeof input.company === 'string' && input.company.trim()) return { ok: false, error: 'Please try again.' }
    if (await rateLimited('ai-contact', 5, 60 * 60 * 1000)) {
      return { ok: false, error: 'Too many attempts from this connection. Please try later.' }
    }
    const name = String(input.name ?? '').trim().slice(0, 120)
    if (!name) return { ok: false, error: 'Please tell us your name.' }
    const phone = normalizePhone(input.phone)
    if (!phone) return { ok: false, error: 'Enter a valid 10-digit mobile number.' }
    if (!input.consent) return { ok: false, error: 'Please tick the box so our team may call you.' }

    const state = await loadConversation(input.conversationId, input.token)
    if (!state) return { ok: false, error: 'This chat has expired. Please start a new one.' }

    const payload = await getPayloadClient()
    const aiPlan = planSummary(state)
    if (state.leadId) {
      await payload.update({ collection: 'leads', id: state.leadId, data: { name, phone, aiPlan } })
    } else {
      const lead = await payload.create({
        collection: 'leads',
        data: {
          name,
          phone,
          eventType: leadEventType(state.brief.eventType),
          message: 'Planned with Zenfest AI on the website. See the AI plan below.',
          aiPlan,
          source: 'zenfest-ai',
        },
      })
      state.leadId = String(lead.id)
      await payload.update({
        collection: 'ai-conversations',
        id: state.id,
        data: { lead: lead.id, status: state.status === 'handed-off' ? 'handed-off' : 'lead' },
      })
      if (state.status !== 'handed-off') state.status = 'lead'
    }

    const message = `Thank you, ${name}! Our team will call you on ${phone} to confirm your plan and prices.`
    state.transcript.push({ kind: 'notice', id: transcriptId(), text: message })
    await saveConversation(state)
    return { ok: true, message }
  } catch (err) {
    console.error('[zenfest-ai] contact failed:', err instanceof Error ? err.message : err)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
