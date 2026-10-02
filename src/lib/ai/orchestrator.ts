// Server-only: Zenfest, the coordinator agent. It talks to the customer and hands
// services to their specialists (lib/ai/specialist.ts) through consult_specialists.
// Specialist answers go to the customer as cards, straight from their JSON, so nothing
// is lost or reworded on the way. Runs on any OpenAI-compatible host (Groq by default).
import * as z from 'zod/v4'

import OpenAI from 'openai'

import { aiClient, isRateLimit } from './client'
import { AI_LIMITS, addUsage, coordinatorFallbackModel, effortParam } from './config'
import type { ConversationState } from './conversation'
import { COMPLETE_PLANNING } from './intake'
import type { SpecialistKnowledge } from './knowledge'
import { runSpecialist, type EventBrief } from './specialist'
import { formatRange, type ChatItem, type StreamEvent } from './types'

type Emit = (e: StreamEvent) => void
type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
type Tool = OpenAI.Chat.Completions.ChatCompletionFunctionTool

const SYSTEM = `You are Zenfest, the AI event planner of Zenfest Events — an event management company near Chennai with branches at Guduvancheri and Thiruverkadu. Zenfest Events handles weddings, birthdays, corporate functions, housewarmings and sports events.

You coordinate a team of specialist agents, one per service (décor, catering, photography, DJ and so on). You never plan a service's details yourself: you ask the specialists with consult_specialists. Each specialist's answer — recommendations and an estimate — is shown to the customer as a card directly under your message.

Your job in each conversation:
1. A CONFIRMED EVENT FACTS block follows these instructions. Everything in it is settled — NEVER ask for any of it again (event type, who is planning, dates/months, place, guests, services, name, phone). Ask only for what is missing, at most two questions at a time.
   Whenever the customer tells you something new or changed (budget, theme, colours, indoor/outdoor, venue name, an exact date, extra services…), call save_event_details so it is remembered. If the detail changes what a specialist would suggest (budget, theme, venue, guests, dates), list those services in its "replan" field — the server then gets fresh suggestions from them in the same step.
   Never say a team is "updating", "working on" or "preparing" something unless you asked them (consult_specialists, or replan) in this reply.
2. As soon as you know the event type and a rough guest count AND which services they want, call consult_specialists right away, in that same reply, ONCE with every wanted service in its "requests" list — they run together. Do NOT first ask about budget, menu, style or other preferences: pass what you know (null for the rest) and let the specialists ask their own questions in their cards. Consult again when the details change.
3. After specialist cards appear, don't repeat their items or prices. Add at most two or three sentences: how the pieces fit together and the single most useful next question (often one a specialist asked).
4. When the plan has taken shape, or the customer wants to book, confirm, get a final quote or talk to someone, call request_contact_details. Never ask for a phone number in chat.
5. If they need something you can't help with (an existing booking, a complaint, payments, or they ask for a person), call handoff_to_human.

Rules:
- Estimates come only from specialist cards. Never state, add up or invent prices yourself, and never offer discounts.
- Never confirm a booking, date availability, a vendor or a final price, and never promise the final quote will fit a budget. The Zenfest team confirms everything when they call.
- For a service with no specialist, say the team can arrange or advise on it when they call.
- Stay on event planning with Zenfest Events; politely decline anything else.
- Reply in the customer's language — English, Tamil (தமிழ்) or Tanglish — matching how they write, and pass that language to the specialists.
- Be warm, brief and practical: short paragraphs, no long lists, no tables, ₹ for money.
- You are an AI assistant. If asked, say so plainly.`

const nullable = (type: 'string' | 'integer', description: string) => ({ type: [type, 'null'], description })

function buildTools(specialists: SpecialistKnowledge[]): Tool[] {
  const tools: Tool[] = []
  if (specialists.length) {
    tools.push({
      type: 'function',
      function: {
        name: 'consult_specialists',
        description:
          "Ask Zenfest's specialist agents for recommendations and estimates. Put every service the customer wants in `requests` (one entry per service); they run together and each answer is shown to the customer as a card.\n\nSpecialists:\n" +
          specialists.map((s) => `- ${s.slug}: ${s.agentName} (${s.service})`).join('\n'),
        parameters: {
          type: 'object',
          properties: {
            eventType: nullable('string', 'e.g. wedding, birthday, corporate function; null if unknown.'),
            eventDate: nullable('string', 'Date or rough timing as the customer gave it; null if unknown.'),
            area: nullable('string', 'Area, city or venue; null if unknown.'),
            // Number or text: Groq rejects the whole reply if the type doesn't match.
            guestCount: { type: ['integer', 'string', 'null'], description: 'Approximate number of guests; null if unknown.' },
            budget: nullable('string', 'Budget, as the customer gave it; null if unknown.'),
            language: { type: 'string', description: "The customer's language: English, Tamil or Tanglish." },
            requests: {
              type: 'array',
              minItems: 1,
              description: 'One entry per service to plan.',
              items: {
                type: 'object',
                properties: {
                  // No enum: Groq rejects the whole reply when a model writes "decor" for
                  // "decoration"; resolveSpecialist() matches names loosely instead.
                  service: { type: 'string', description: 'Which specialist, by its key from the list above.' },
                  wishes: { type: 'string', description: 'What the customer wants from this service, in their words where possible.' },
                },
                required: ['service', 'wishes'],
                additionalProperties: false,
              },
            },
          },
          // Only `requests` is required: missing event details are filled from the saved facts.
          required: ['requests'],
          additionalProperties: false,
        },
      },
    })
  }
  tools.push(
    {
      type: 'function',
      function: {
        name: 'save_event_details',
        description:
          'Remember a new or changed detail the customer just gave (budget, theme or colours, indoor/outdoor, venue, an exact date, extra services…). Saved details appear in the CONFIRMED EVENT FACTS from then on.',
        parameters: {
          type: 'object',
          properties: {
            budget: { type: ['string', 'null'], description: 'Budget as the customer said it.' },
            theme: { type: ['string', 'null'], description: 'Theme, style or colours.' },
            venueType: { type: ['string', 'null'], description: 'Indoor / outdoor / venue name or type.' },
            other: { type: ['string', 'null'], description: 'Any other detail worth remembering, in a short phrase.' },
            replan: {
              type: 'array',
              items: { type: 'string' },
              description: 'Service keys whose suggestions this detail changes (e.g. ["photography"]); they are re-consulted right away. Empty if none.',
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'request_contact_details',
        description:
          'Show the customer a short form to share their name and phone number so the Zenfest team can call with a confirmed quote. Use once the plan has taken shape, or whenever they want to book, confirm, get a final price or talk to someone.',
        parameters: {
          type: 'object',
          properties: { reason: { type: 'string', description: 'One short line shown above the form, in the customer’s language.' } },
          required: ['reason'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'handoff_to_human',
        description:
          'Hand the customer to the Zenfest team (WhatsApp, call, or the contact form) when they need something you cannot do: an existing booking, a complaint, payments, or they ask for a person.',
        parameters: {
          type: 'object',
          properties: { reason: { type: 'string', description: 'One short line for the customer, in their language.' } },
          required: ['reason'],
          additionalProperties: false,
        },
      },
    },
  )
  return tools
}

const ConsultInput = z.object({
  eventType: z.string().nullish(),
  eventDate: z.string().nullish(),
  area: z.string().nullish(),
  guestCount: z.union([z.number(), z.string()]).nullish(),
  budget: z.string().nullish(),
  language: z.string().nullish(),
  requests: z.array(z.object({ service: z.string(), wishes: z.string().nullish() })).min(1),
})
const ReasonInput = z.object({ reason: z.string() })
const DetailsInput = z.object({
  budget: z.string().nullish(),
  theme: z.string().nullish(),
  venueType: z.string().nullish(),
  other: z.string().nullish(),
  replan: z.array(z.string()).nullish(),
})

const EXTRA_LABELS: Record<string, string> = { budget: 'Budget', theme: 'Theme / colours', venueType: 'Venue', other: 'Other details' }

/** What Zenfest must treat as settled: the intake answers plus details saved since. */
function factsBlock(state: ConversationState): string {
  const b = state.brief
  const lines: string[] = []
  if (b.intakeRows?.length) {
    for (const [k, v] of b.intakeRows) lines.push(`- ${k}: ${v}`)
  } else {
    if (b.eventType) lines.push(`- Event: ${b.eventType}`)
    if (b.eventDate) lines.push(`- When: ${b.eventDate}`)
    if (b.area) lines.push(`- Where: ${b.area}`)
    if (b.guestCount) lines.push(`- Guests: about ${b.guestCount}`)
  }
  for (const [k, v] of Object.entries(b.extra ?? {})) if (v) lines.push(`- ${EXTRA_LABELS[k] ?? k}: ${v}`)
  if (b.budget && !b.extra?.budget) lines.push(`- Budget: ${b.budget}`)
  if (state.leadId) lines.push('- Contact: name and phone already with the Zenfest team (never ask for them).')
  return lines.length
    ? `CONFIRMED EVENT FACTS (settled — never ask for these again):\n${lines.join('\n')}`
    : 'CONFIRMED EVENT FACTS: none yet — find out the basics.'
}

const norm = (v: string) =>
  v
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // strip accents: Décor → Decor
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** The specialist a model meant: by key, service or agent name, allowing "decor", "DJ", "Zenfest Beats"… */
function resolveSpecialist(name: string, specialists: SpecialistKnowledge[]): SpecialistKnowledge | undefined {
  const n = norm(name).replace(/^zenfest/, '')
  if (!n) return undefined
  const keys = (s: SpecialistKnowledge) => [s.slug, s.service, s.agentName.replace(/^zenfest\s*/i, '')].map(norm)
  return (
    specialists.find((s) => keys(s).includes(n)) ??
    specialists.find((s) => keys(s).some((k) => k.startsWith(n) || n.startsWith(k))) ??
    specialists.find((s) => keys(s).some((k) => k.includes(n) || n.includes(k)))
  )
}

/** 300, "300", "about 300", "300-350" → 300; anything else → null. */
function toGuestCount(v: number | string | null | undefined): number | null {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').match(/\d+/)?.[0])
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

let seq = 0
const itemId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`

function todayLine(): string {
  const d = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
  return `(Context: today is ${d}.)`
}

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return null
  }
}

type Base = Omit<EventBrief, 'wishes'>

/** Runs specialists in parallel, shows their cards, and returns a summary for Zenfest. */
async function consultJobs(
  state: ConversationState,
  base: Base,
  jobs: { k: SpecialistKnowledge; wishes: string }[],
  emit: Emit,
) {
  for (const { k } of jobs) emit({ type: 'specialist_start', service: k.slug, agentName: k.agentName, emoji: k.emoji })
  return Promise.all(
    jobs.map(async ({ k, wishes }) => {
      const run = await runSpecialist(k, { ...base, wishes })
      for (const u of run.usage) state.usage = addUsage(state.usage, u.model, u.usage)
      if (run.outOfScope) return { agent: k.agentName, shownToCustomer: false, note: `Not about ${k.service}; no card shown.` }
      state.specialistResults[k.slug] = run.card
      state.transcript.push({ kind: 'specialist', id: itemId(), card: run.card })
      emit({ type: 'specialist_result', card: run.card })
      const c = run.card
      return {
        agent: c.agentName,
        shownToCustomer: true,
        summary: c.summary,
        picks: c.picks.map((p) => `${p.name} × ${p.qty} ${p.unit}`),
        estimate: c.estimate ? formatRange(c.estimate) : null,
        someItemsPriceOnRequest: c.priceOnRequest,
        questionsForCustomer: c.questions,
        notes: c.notes,
        noOptionsEnteredYet: c.noKnowledge,
      }
    }),
  )
}

const isWedding = (i?: { eventType: string }) => i?.eventType === 'wedding' || i?.eventType === 'engagement'

/**
 * Zenfest's first reply after the intake form. The form already names the services,
 * so the server consults those specialists itself (models sometimes fumbled this first
 * call), then Zenfest writes a short summary and the next question. The customer sees
 * the "Your event" card in place of a message.
 */
export async function runKickoff(opts: {
  state: ConversationState
  specialists: SpecialistKnowledge[]
  emit: Emit
}): Promise<void> {
  const { state, specialists, emit } = opts
  const intake = state.brief.intake
  const rows = state.brief.intakeRows ?? []
  // Full name: Tamil names often start with an initial ("R. Kumar"), so no first-name guess.
  const name = intake?.name ?? ''
  const chosen = intake?.services.includes(COMPLETE_PLANNING)
    ? specialists
    : (intake?.services ?? [])
        .map((slug) => specialists.find((s) => s.slug === slug))
        .filter((k): k is SpecialistKnowledge => Boolean(k))

  let results: unknown[] = []
  if (chosen.length) {
    const who = chosen
      .map((k) => k.agentName)
      .join(', ')
      .replace(/, ([^,]*)$/, ' and $1')
    const intro = `Thank you, ${name}! I've passed your event details to ${who} — here's what they suggest.`
    emit({ type: 'text', delta: intro })
    state.transcript.push({ kind: 'assistant', id: itemId(), text: intro })
    const base: Base = {
      eventType: state.brief.eventType ?? null,
      eventDate: state.brief.eventDate ?? null,
      area: state.brief.area ?? null,
      guestCount: state.brief.guestCount ?? null,
      budget: null,
      language: 'English',
    }
    const wishes = [isWedding(intake) ? `Plan for these functions: ${base.eventDate}.` : '', intake?.notes ?? '']
      .filter(Boolean)
      .join(' ')
    results = await consultJobs(
      state,
      base,
      chosen.map((k) => ({ k, wishes })),
      emit,
    )
  }

  const userText = [
    'A customer just filled in the intake form before the chat:',
    ...rows.filter(([k]) => k !== 'Phone').map(([k, v]) => `- ${k}: ${v}`),
    '',
    'They already shared their name and phone number; the team has them, so never ask for contact details. Do not ask again for anything listed above.',
    chosen.length
      ? `You already told them their details went to the specialists, and the specialists' cards are now shown to them. Results: ${JSON.stringify(results)}\nDo not call consult_specialists now. In two or three sentences, say how the pieces fit their functions and ask the single most useful next question.`
      : 'Greet them by name in one short, warm line and ask which services they need (décor, catering, photography, DJ…).',
    'Reply in English unless their notes are in Tamil or Tanglish.',
  ].join('\n')
  await runTurn({ state, userText, specialists, emit, hidden: true })
}

/** Runs Zenfest for one customer message, streaming events and updating `state` in place. */
export async function runTurn(opts: {
  state: ConversationState
  userText: string
  specialists: SpecialistKnowledge[]
  emit: Emit
  /** Don't add the message to the visible transcript (the intake kickoff). */
  hidden?: boolean
}): Promise<void> {
  const { state, userText, specialists, emit, hidden } = opts
  const tools = buildTools(specialists)
  const { client, model } = aiClient('coordinator')
  const history = state.messages as Message[]

  // Notes travel inside the new user message, so earlier history is never edited.
  const notes: string[] = []
  if (history.length === 0) notes.push(todayLine())
  if (state.leadId && !state.leadNotified) {
    notes.push('(Context: the customer has already shared their contact details; the team will call them. Don’t ask again.)')
    state.leadNotified = true
  }
  history.push({ role: 'user', content: [...notes, userText].join('\n\n') })
  if (!hidden) state.transcript.push({ kind: 'user', id: itemId(), text: userText })

  let specialistCalls = 0
  for (let loop = 0; loop < AI_LIMITS.maxLoopsPerTurn; loop++) {
    let text = ''
    let finish: string | null = null
    let servedBy = model
    let usage: Parameters<typeof addUsage>[2] = null
    const calls = new Map<number, { id: string; name: string; args: string }>()

    const request = (m: string) =>
      client.chat.completions.create({
        model: m,
        // The facts are rebuilt from the saved brief on every request, never stored in
        // history, so the model always has the intake and anything learned since.
        messages: [{ role: 'system', content: `${SYSTEM}\n\n${factsBlock(state)}` }, ...history],
        tools,
        tool_choice: 'auto',
        ...effortParam(m, 'coordinator'),
        max_completion_tokens: 4000,
        stream: true,
        stream_options: { include_usage: true },
      })
    let stream
    try {
      stream = await request(model)
    } catch (err) {
      // The coordinator's model is out of free quota, retired or unknown: answer this
      // request with the fallback model instead (errors arrive before any streaming).
      const fallback = coordinatorFallbackModel()
      const switchable = isRateLimit(err) || err instanceof OpenAI.NotFoundError || err instanceof OpenAI.BadRequestError
      if (!fallback || fallback === model || !switchable) throw err
      console.warn(`[zenfest-ai] ${model} failed (${err instanceof Error ? err.message : err}); using ${fallback}`)
      servedBy = fallback
      stream = await request(fallback)
    }
    for await (const chunk of stream) {
      servedBy = chunk.model || servedBy
      // Groq reports streaming usage on its own x_groq field as well.
      usage = chunk.usage ?? (chunk as { x_groq?: { usage?: typeof usage } }).x_groq?.usage ?? usage
      const choice = chunk.choices[0]
      if (!choice) continue
      const delta = choice.delta
      if (delta?.content) {
        text += delta.content
        emit({ type: 'text', delta: delta.content })
      }
      for (const tc of delta?.tool_calls ?? []) {
        const cur = calls.get(tc.index) ?? { id: '', name: '', args: '' }
        if (tc.id) cur.id = tc.id
        if (tc.function?.name) cur.name += tc.function.name
        if (tc.function?.arguments) cur.args += tc.function.arguments
        calls.set(tc.index, cur)
      }
      if (choice.finish_reason) finish = choice.finish_reason
    }
    state.usage = addUsage(state.usage, servedBy, usage)
    if (finish !== 'stop' && finish !== 'tool_calls') {
      console.warn(`[zenfest-ai] ${servedBy} reply ended with finish_reason=${finish}`)
    }
    if (text.trim()) state.transcript.push({ kind: 'assistant', id: itemId(), text })

    if (finish === 'length' || finish === 'content_filter') {
      // Not appended: a cut-off turn can hold half a tool call.
      const notice = 'I can’t finish that here, but our team can — leave your number and they’ll call you.'
      emit({ type: 'notice', text: notice, showContact: true })
      state.transcript.push({ kind: 'notice', id: itemId(), text: notice })
      break
    }

    const toolCalls = [...calls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([i, c]) => ({ ...c, id: c.id || `call_${loop}_${i}` }))
    history.push({
      role: 'assistant',
      content: text || null,
      ...(toolCalls.length
        ? { tool_calls: toolCalls.map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: c.args || '{}' } })) }
        : {}),
    })
    if (toolCalls.length === 0) break

    for (const call of toolCalls) {
      const content = await runTool(call.name, parseArgs(call.args))
      history.push({ role: 'tool', tool_call_id: call.id, content })
    }
  }

  state.turns += 1

  async function runTool(name: string, input: unknown): Promise<string> {
    if (name === 'consult_specialists') {
      const parsed = ConsultInput.safeParse(input)
      if (!parsed.success) return 'Error: invalid input. Send eventType, eventDate, area, guestCount, budget, language and requests.'
      const d = parsed.data
      const b = state.brief
      // The intake form is the source of truth for the basics; the model's values only
      // fill gaps (chats without an intake) and never overwrite it.
      const fromForm = Boolean(b.intake)
      const pick = <T,>(saved: T | null | undefined, given: T | null | undefined): T | null =>
        (fromForm ? (saved ?? given) : (given ?? saved)) ?? null
      const base = {
        eventType: pick(b.eventType, d.eventType),
        eventDate: pick(b.eventDate, d.eventDate),
        area: pick(b.area, d.area),
        guestCount: pick(b.guestCount, toGuestCount(d.guestCount)),
        budget: d.budget ?? b.budget ?? b.extra?.budget ?? null,
        language: d.language || b.language || 'English',
      }
      for (const [key, value] of Object.entries(base)) {
        if (value != null) (state.brief as Record<string, unknown>)[key] = value
      }

      // One entry per known specialist, capped per customer message.
      const seen = new Set<string>()
      const jobs: { k: SpecialistKnowledge; wishes: string }[] = []
      const skipped: string[] = []
      for (const r of d.requests) {
        const k = resolveSpecialist(r.service, specialists)
        if (!k || seen.has(k.slug)) continue
        if (specialistCalls >= AI_LIMITS.maxSpecialistCallsPerTurn) {
          skipped.push(k.slug)
          continue
        }
        seen.add(k.slug)
        specialistCalls++
        jobs.push({ k, wishes: r.wishes ?? '' })
      }
      if (!jobs.length) {
        return `Error: no known specialist in requests. Use these service keys: ${specialists.map((x) => x.slug).join(', ')}, and fill in the event details you know.`
      }
      const results = await consultJobs(state, base, jobs, emit)
      return JSON.stringify({ results, ...(skipped.length ? { notConsultedLimitReached: skipped } : {}) })
    }

    if (name === 'save_event_details') {
      const parsed = DetailsInput.safeParse(input)
      if (!parsed.success) return 'Error: invalid input.'
      const { replan, ...details } = parsed.data
      const extra = { ...(state.brief.extra ?? {}) }
      const said: string[] = []
      for (const [k, v] of Object.entries(details)) {
        // Models often repeat the label ("Budget: 3 lakhs"); keep just the value.
        const text = typeof v === 'string' ? v.trim().replace(/^(budget|theme|colou?rs?|venue(\s*type)?|other)\s*[:\-–]\s*/i, '').slice(0, 300) : ''
        if (!text) continue
        // "other" details accumulate; the named ones are replaced by the latest value.
        extra[k] = k === 'other' && extra.other && !extra.other.includes(text) ? `${extra.other}; ${text}` : text
        said.push(`${EXTRA_LABELS[k] ?? k}: ${text}`)
      }
      state.brief.extra = extra
      if (extra.budget) state.brief.budget = extra.budget

      // Saving and re-planning in one step: models often saved the detail and then only
      // *said* the team would update, without consulting anyone.
      const jobs: { k: SpecialistKnowledge; wishes: string }[] = []
      for (const name of replan ?? []) {
        const k = resolveSpecialist(name, specialists)
        if (!k || jobs.some((j) => j.k.slug === k.slug) || specialistCalls >= AI_LIMITS.maxSpecialistCallsPerTurn) continue
        specialistCalls++
        jobs.push({ k, wishes: `Update your suggestions for this change — ${said.join('; ')}.` })
      }
      if (!jobs.length) return 'Saved. It is now part of the confirmed facts.'
      const b = state.brief
      const base = {
        eventType: b.eventType ?? null,
        eventDate: b.eventDate ?? null,
        area: b.area ?? null,
        guestCount: b.guestCount ?? null,
        budget: b.budget ?? null,
        language: b.language || 'English',
      }
      const results = await consultJobs(state, base, jobs, emit)
      return JSON.stringify({ saved: true, replanned: results })
    }

    if (name === 'request_contact_details' || name === 'handoff_to_human') {
      const parsed = ReasonInput.safeParse(input)
      const reason = parsed.success ? parsed.data.reason.slice(0, 200) : ''
      const handoff = name === 'handoff_to_human'
      const item: ChatItem = handoff ? { kind: 'handoff', id: itemId(), reason } : { kind: 'contact', id: itemId(), reason }
      state.transcript.push(item)
      if (handoff) state.status = 'handed-off'
      emit(handoff ? { type: 'handoff', reason } : { type: 'contact_request', reason })
      return state.leadId
        ? 'The customer already shared their details; the form was shown again in case they want to update them.'
        : 'The form is now shown to the customer. Finish with one short line; don’t ask for the details in chat.'
    }

    return `Error: unknown tool ${name}.`
  }
}
