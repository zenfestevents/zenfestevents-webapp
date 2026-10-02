// Server-only: what each Zenfest AI specialist is allowed to know, loaded from the
// `ai` group on Services (entered by the owner in /admin).
import type { Service } from '../../payload-types'
import { getPayloadClient } from '../payload'
import type { AgentProfile } from './types'

export type KnowledgeOption = {
  id: string
  name: string
  description: string
  unit: 'event' | 'plate' | 'hour' | 'person'
  priceMin: number | null
  priceMax: number | null
  minQty: number | null
}

export type SpecialistKnowledge = {
  slug: string
  service: string
  agentName: string
  emoji: string
  persona: string
  description: string
  options: KnowledgeOption[]
  rules: string
  faqs: { question: string; answer: string }[]
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)

function toKnowledge(s: Service): SpecialistKnowledge | null {
  if (!s.ai?.enabled || !s.slug) return null
  return {
    slug: s.slug,
    service: s.title,
    agentName: s.ai.agentName?.trim() || `Zenfest ${s.title}`,
    emoji: s.ai.agentEmoji?.trim() || '✨',
    persona: s.ai.persona?.trim() || '',
    description: [s.summary, s.description].filter(Boolean).join('\n'),
    options: (s.ai.options ?? [])
      .filter((o) => o.id && o.name)
      .map((o) => ({
        id: String(o.id),
        name: o.name,
        description: o.description ?? '',
        unit: o.unit ?? 'event',
        priceMin: num(o.priceMin),
        priceMax: num(o.priceMax),
        minQty: num(o.minQty),
      })),
    rules: s.ai.rules?.trim() || '',
    faqs: (s.ai.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
  }
}

/** Every enabled specialist, sorted by slug so the coordinator's tool list is stable (prompt cache). */
export async function loadSpecialists(): Promise<SpecialistKnowledge[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'services',
    where: { 'ai.enabled': { equals: true } },
    depth: 0,
    limit: 50,
    pagination: false,
  })
  return res.docs
    .map(toKnowledge)
    .filter((k): k is SpecialistKnowledge => k !== null)
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

/** Public profile cards for the homepage band (no prices or rules). Empty on any error. */
export async function getAgentProfiles(): Promise<AgentProfile[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'services',
      where: { 'ai.enabled': { equals: true } },
      depth: 0,
      limit: 50,
      sort: 'order',
      pagination: false,
    })
    return res.docs
      .map(toKnowledge)
      .filter((k): k is SpecialistKnowledge => k !== null)
      .map((k) => ({
        slug: k.slug,
        name: k.agentName,
        emoji: k.emoji,
        service: k.service,
        summary: res.docs.find((d) => d.slug === k.slug)?.summary ?? '',
      }))
  } catch {
    return []
  }
}
