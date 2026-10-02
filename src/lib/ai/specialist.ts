// Server-only: one Zenfest AI specialist agent. It sees only its own service's
// knowledge, answers in a fixed JSON shape, and never writes a price: estimates are
// added up here from the admin's ranges.
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import * as z from 'zod/v4'

import { aiClient } from './client'
import { effortParam } from './config'
import type { KnowledgeOption, SpecialistKnowledge } from './knowledge'
import type { SpecialistCard, SpecialistPick } from './types'

/** Event basics Zenfest passes to a specialist (the consult_specialist tool input). */
export type EventBrief = {
  eventType: string | null
  eventDate: string | null
  area: string | null
  guestCount: number | null
  budget: string | null
  wishes: string
  language: string
}

/** Option names as the model must write them (trimmed, unique). */
const optionNames = (k: SpecialistKnowledge) => [...new Set(k.options.map((o) => o.name.trim()))]

/**
 * The specialist's answer shape. Picks name an option exactly — an enum of this
 * service's option names, so strict mode can only return real options. (Opaque ids
 * got mixed up: the model meant one option and wrote another's id.)
 */
function answerSchema(k: SpecialistKnowledge) {
  const names = optionNames(k)
  return z.object({
    summary: z.string(),
    picks: z.array(z.object({ option: z.enum(names as [string, ...string[]]), qty: z.number(), why: z.string() })),
    questionsForCustomer: z.array(z.string()),
    notes: z.string(),
    outOfScope: z.boolean(),
  })
}

type Answer = {
  summary: string
  picks: { option: string; qty: number; why: string }[]
  questionsForCustomer: string[]
  notes: string
  outOfScope: boolean
}

const UNIT_LABEL: Record<KnowledgeOption['unit'], string> = {
  event: 'per event',
  plate: 'per plate',
  hour: 'per hour',
  person: 'per person',
}

function priceText(o: KnowledgeOption): string {
  if (o.priceMin == null && o.priceMax == null) return 'price on request'
  const lo = o.priceMin ?? o.priceMax
  const hi = o.priceMax ?? o.priceMin
  return lo === hi ? `₹${lo} ${UNIT_LABEL[o.unit]}` : `₹${lo}–₹${hi} ${UNIT_LABEL[o.unit]}`
}

/** Frozen per service, so it caches across customers until the owner edits the service. */
function systemPrompt(k: SpecialistKnowledge): string {
  const options = k.options
    .map(
      (o) =>
        `- id: ${o.id}\n  name: ${o.name}\n  unit: ${o.unit}\n  price: ${priceText(o)}` +
        (o.minQty ? `\n  minimum quantity: ${o.minQty}` : '') +
        (o.description ? `\n  description: ${o.description}` : ''),
    )
    .join('\n')
  const faqs = k.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
  return `You are ${k.agentName}, the ${k.service} specialist at Zenfest Events, an event management company near Chennai (branches in Guduvancheri and Thiruverkadu). Zenfest, the lead planner, consults you about one customer's event. You handle ${k.service} only.
${k.persona ? `\n${k.persona}\n` : ''}
The facts below are everything you know. Use nothing else.

<service_description>
${k.description || '(none)'}
</service_description>

<options>
${options}
</options>

<rules>
${k.rules || '(none)'}
</rules>

<faqs>
${faqs || '(none)'}
</faqs>

How to answer:
- Recommend only options from the list, writing each option's name exactly as listed. Pick a quantity in the option's unit: plates = guests eating, person = number of people, hour = hours of service, event = usually 1. Respect minimum quantities and the rules.
- If the customer gave a budget, choose picks whose lowest prices together stay within it; prefer fewer, well-chosen picks over many.
- Use the prices only to fit the customer's budget. Never write a price, total, discount or number of rupees in any text field: the system calculates estimates from the price list and shows them itself.
- Never promise availability, dates, named vendors, follow-up calls or a confirmed booking. The Zenfest team confirms everything.
- Each pick's "why" must describe that exact option, not a different one.
- When a detail is missing, assume what is most typical for this kind of event in Tamil Nadu (e.g. a wedding reception is an evening dinner on a stage; the muhurtham is the morning ceremony) and state the assumption in notes.
- If the customer wants something that is not in your options, don't invent it. Say in notes that the team will advise.
- If the request has nothing to do with ${k.service}, set outOfScope to true and leave picks empty.
- questionsForCustomer: at most 3 short questions that would most improve your recommendation. Don't ask what the brief already answers.
- summary: 1–2 friendly sentences. why: one short phrase per pick. notes: anything the customer should know (one or two sentences), or an empty string. Never mention "the system", price lists, ranges or totals in any text — the customer sees prices separately.
- Keep the whole answer short: at most 5 picks.
- Write every text field in the customer's language given in the brief (English, Tamil or Tanglish).`
}

function briefText(b: EventBrief): string {
  return [
    `Event type: ${b.eventType ?? 'unknown'}`,
    `Date: ${b.eventDate ?? 'unknown'}`,
    `Area / venue: ${b.area ?? 'unknown'}`,
    `Guests: ${b.guestCount ?? 'unknown'}`,
    `Budget: ${b.budget ?? 'not given'}`,
    `Customer's language: ${b.language || 'English'}`,
    `What the customer wants from this service: ${b.wishes || '(not specific yet)'}`,
  ].join('\n')
}

/** Prices the picks from the admin's ranges. Unknown option names are dropped. */
export function priceCard(
  k: SpecialistKnowledge,
  answer: Pick<Answer, 'picks'>,
): Pick<SpecialistCard, 'picks' | 'estimate' | 'priceOnRequest'> {
  const seen = new Set<string>()
  const picks: SpecialistPick[] = []
  let min = 0
  let max = 0
  let priced = 0
  let priceOnRequest = false
  for (const p of answer.picks) {
    const o = k.options.find((x) => x.name.trim().toLowerCase() === p.option.trim().toLowerCase())
    if (!o || seen.has(o.id)) continue
    seen.add(o.id)
    let qty = Math.round(Number(p.qty) || 1)
    qty = Math.min(Math.max(qty, o.minQty ?? 1, 1), 100000)
    const lo = o.priceMin ?? o.priceMax
    const hi = o.priceMax ?? o.priceMin
    if (lo == null || hi == null) {
      priceOnRequest = true
      picks.push({
        name: o.name,
        unit: o.unit,
        qty,
        why: p.why,
        min: null,
        max: null,
      })
      continue
    }
    const lineMin = Math.min(lo, hi) * qty
    const lineMax = Math.max(lo, hi) * qty
    min += lineMin
    max += lineMax
    priced++
    picks.push({
      name: o.name,
      unit: o.unit,
      qty,
      why: p.why,
      min: lineMin,
      max: lineMax,
    })
  }
  return { picks, estimate: priced ? { min, max } : null, priceOnRequest }
}

const teamWillAdvise = (k: SpecialistKnowledge, summary: string): SpecialistCard => ({
  service: k.slug,
  agentName: k.agentName,
  emoji: k.emoji,
  summary,
  picks: [],
  estimate: null,
  priceOnRequest: false,
  questions: [],
  notes: '',
  noKnowledge: true,
})

export type SpecialistRun = {
  card: SpecialistCard
  outOfScope: boolean
  usage: {
    model: string
    usage: { prompt_tokens?: number; completion_tokens?: number }
  }[]
}


/** One model call; null when the reply isn't a valid answer. */
async function ask(k: SpecialistKnowledge, brief: EventBrief, usage: SpecialistRun['usage']): Promise<Answer | null> {
  const { client, model } = aiClient('specialist')
  // Strict JSON schema (all fields required, closed objects) — supported by GPT-OSS
  // and Qwen on Groq. Still re-checked with zod: other hosts may only do best-effort JSON.
  const schema = answerSchema(k)
  let res
  try {
    res = await client.chat.completions.create({
      model,
      max_completion_tokens: 8000,
      ...effortParam(model, 'specialist'),
      response_format: zodResponseFormat(schema, 'specialist_answer'),
      messages: [
        { role: 'system', content: systemPrompt(k) },
        { role: 'user', content: briefText(brief) },
      ],
    })
  } catch (err) {
    // Strict mode: Groq answers 400 when the model's JSON doesn't fit the schema
    // (e.g. cut off before the last fields). Treat as a bad answer so it is retried.
    if (err instanceof OpenAI.BadRequestError) {
      console.warn(`[zenfest-ai] specialist ${k.slug}: invalid JSON from model, retrying`)
      return null
    }
    throw err
  }
  if (res.usage) usage.push({ model: res.model || model, usage: res.usage })
  const text = res.choices[0]?.message?.content
  if (!text) return null
  try {
    const parsed = schema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function runSpecialist(k: SpecialistKnowledge, brief: EventBrief): Promise<SpecialistRun> {
  // Nothing entered in the admin: say so rather than let a model guess.
  if (k.options.length === 0) {
    return {
      card: teamWillAdvise(
        k,
        `Our ${k.service} team will suggest options for your event directly — they'll share choices and prices when they call.`,
      ),
      outOfScope: false,
      usage: [],
    }
  }

  const usage: SpecialistRun['usage'] = []
  try {
    // Small open models occasionally return malformed JSON: one retry, then give up gracefully.
    const answer = (await ask(k, brief, usage)) ?? (await ask(k, brief, usage))
    if (!answer) {
      return {
        card: teamWillAdvise(k, `Our ${k.service} team will take this one up with you directly.`),
        outOfScope: false,
        usage,
      }
    }
    return {
      card: {
        service: k.slug,
        agentName: k.agentName,
        emoji: k.emoji,
        summary: answer.summary,
        ...priceCard(k, answer),
        questions: answer.questionsForCustomer.slice(0, 3),
        notes: answer.notes,
        noKnowledge: false,
      },
      outOfScope: answer.outOfScope,
      usage,
    }
  } catch (err) {
    console.error(`[zenfest-ai] specialist ${k.slug} failed:`, err instanceof Error ? err.message : err)
    return {
      card: teamWillAdvise(
        k,
        `I couldn't prepare ${k.service} suggestions just now — our team will cover it when they call.`,
      ),
      outOfScope: false,
      usage,
    }
  }
}
