// Turns Meta's nested webhook payload into flat events. Pure (no server imports).

export type WaInbound = {
  kind: 'message'
  id: string
  from: string
  name: string
  at: string
  type: string
  text: string
}

export type WaStatus = {
  kind: 'status'
  id: string
  to: string
  status: string
  at: string
  error: string
}

type RawMessage = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  button?: { text?: string }
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }
  location?: { latitude?: number; longitude?: number }
  reaction?: { emoji?: string }
  [media: string]: unknown
}

type RawStatus = {
  id?: string
  recipient_id?: string
  status?: string
  timestamp?: string
  errors?: { code?: number; title?: string }[]
}

export type WebhookBody = {
  entry?: {
    changes?: {
      field?: string
      value?: {
        contacts?: { wa_id?: string; profile?: { name?: string } }[]
        messages?: RawMessage[]
        statuses?: RawStatus[]
      }
    }[]
  }[]
}

const toIso = (ts?: string) => (ts ? new Date(Number(ts) * 1000) : new Date()).toISOString()

/** What a person sent, as one line of text (buttons, media and locations included). */
export function messageText(m: RawMessage): string {
  switch (m.type) {
    case 'text':
      return m.text?.body ?? ''
    case 'button': // quick-reply button on a template
      return m.button?.text ?? ''
    case 'interactive':
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? ''
    case 'image':
    case 'video':
    case 'document':
    case 'audio':
    case 'sticker': {
      const media = m[m.type] as { caption?: string } | undefined
      return `[${m.type}] ${media?.caption ?? ''}`.trim()
    }
    case 'location':
      return `[location] ${m.location?.latitude},${m.location?.longitude}`
    case 'reaction':
      return `[reaction] ${m.reaction?.emoji ?? ''}`
    default:
      return `[${m.type ?? 'unknown'}]`
  }
}

export function extractEvents(body: WebhookBody): (WaInbound | WaStatus)[] {
  const events: (WaInbound | WaStatus)[] = []
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== 'messages') continue
      const value = change.value ?? {}
      const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? '']))

      for (const m of value.messages ?? []) {
        if (!m.id || !m.from) continue
        events.push({
          kind: 'message',
          id: m.id,
          from: m.from,
          name: names.get(m.from) ?? '',
          at: toIso(m.timestamp),
          type: m.type ?? 'unknown',
          text: messageText(m),
        })
      }

      for (const s of value.statuses ?? []) {
        if (!s.id || !s.status) continue
        events.push({
          kind: 'status',
          id: s.id,
          to: s.recipient_id ?? '',
          status: s.status,
          at: toIso(s.timestamp),
          error: (s.errors ?? []).map((e) => `${e.code}: ${e.title}`).join('; '),
        })
      }
    }
  }
  return events
}

const STOP_WORDS = new Set(['stop', 'stop promotions', 'unsubscribe', 'opt out'])
const START_WORDS = new Set(['start', 'subscribe'])

/** "STOP" / the "Stop promotions" button → 'stop'; "START" → 'start'. */
export function optCommand(text: string): 'stop' | 'start' | null {
  const t = text.trim().toLowerCase().replace(/[.!]+$/, '')
  if (STOP_WORDS.has(t)) return 'stop'
  if (START_WORDS.has(t)) return 'start'
  return null
}
