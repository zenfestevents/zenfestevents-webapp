// Client-safe Zenfest AI shapes shared by the chat route and the chat UI. Must not
// import anything server-only (Payload, the OpenAI SDK): client components use it.

/** One specialist agent as the customer sees it (homepage band, chat). */
export type AgentProfile = {
  slug: string
  name: string
  emoji: string
  service: string
  summary: string
}

/** One option a specialist recommended, priced in code from the admin's ranges. */
export type SpecialistPick = {
  name: string
  unit: string
  qty: number
  why: string
  /** Estimate for this line (₹); null when the admin left the price blank. */
  min: number | null
  max: number | null
}

/** A specialist's answer, shown to the customer as its own card, unedited by Zenfest. */
export type SpecialistCard = {
  service: string
  agentName: string
  emoji: string
  summary: string
  picks: SpecialistPick[]
  /** Sum of the priced picks; null when nothing could be priced. */
  estimate: { min: number; max: number } | null
  /** Some picks have no price in the admin, so the estimate is partial. */
  priceOnRequest: boolean
  questions: string[]
  notes: string
  /** The service has no options entered yet: the team will advise. */
  noKnowledge: boolean
}

/** What the chat shows, in order. Also stored as the conversation transcript. */
export type ChatItem =
  /** The intake form's answers, shown as a "Your event" card at the top of the chat. */
  | { kind: 'intake'; id: string; rows: [string, string][] }
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | { kind: 'specialist'; id: string; card: SpecialistCard }
  | { kind: 'contact'; id: string; reason: string }
  | { kind: 'handoff'; id: string; reason: string }
  | { kind: 'notice'; id: string; text: string }

/** Newline-delimited JSON events streamed by POST /plan/chat. */
export type StreamEvent =
  | { type: 'session'; conversationId: string; token: string }
  | { type: 'text'; delta: string }
  | { type: 'specialist_start'; service: string; agentName: string; emoji: string }
  | { type: 'specialist_result'; card: SpecialistCard }
  | { type: 'contact_request'; reason: string }
  | { type: 'handoff'; reason: string }
  | { type: 'notice'; text: string; showContact?: boolean }
  | { type: 'error'; message: string }
  | { type: 'done' }

export const AI_MAX_MESSAGE_CHARS = 1500

/** Indian-style rupee formatting, e.g. ₹1,25,000. */
export function formatRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export function formatRange(range: { min: number; max: number }): string {
  return range.min === range.max ? formatRupees(range.min) : `${formatRupees(range.min)} – ${formatRupees(range.max)}`
}
