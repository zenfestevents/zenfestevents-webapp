// Zenfest AI chat endpoint: one customer message in, newline-delimited JSON events
// out (lib/ai/types.ts StreamEvent). Lives under /plan, not /api, so it never meets
// Payload's /api/[...slug] catch-all.
import { isRateLimit } from '../../../../lib/ai/client'
import { AI_LIMITS } from '../../../../lib/ai/config'
import {
  createConversation,
  loadConversation,
  overDailyCap,
  refreshLeadPlan,
  saveConversation,
  transcriptId,
  type ConversationState,
} from '../../../../lib/ai/conversation'
import { loadSpecialists } from '../../../../lib/ai/knowledge'
import { runKickoff, runTurn } from '../../../../lib/ai/orchestrator'
import { aiAvailable } from '../../../../lib/ai/status'
import { AI_MAX_MESSAGE_CHARS, type StreamEvent } from '../../../../lib/ai/types'
import { getSiteSettings } from '../../../../lib/getSettings'
import { clientIp, rateLimited } from '../../../../lib/rateLimit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const json = (status: number, error: string) => Response.json({ error }, { status })

export async function POST(request: Request) {
  if (!aiAvailable(await getSiteSettings())) return json(503, 'Zenfest AI is switched off right now.')

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json(400, 'Bad request.')
  }
  if (typeof body.company === 'string' && body.company.trim()) return json(400, 'Please try again.') // honeypot

  // kickoff: Zenfest's first reply after the intake form (no customer message yet).
  const kickoff = body.kickoff === true
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message && !kickoff) return json(400, 'Type a message first.')
  if (message.length > AI_MAX_MESSAGE_CHARS) return json(400, `Please keep messages under ${AI_MAX_MESSAGE_CHARS} characters.`)

  if (await rateLimited('ai-msg', AI_LIMITS.messagesPerWindow, AI_LIMITS.messageWindowMs)) {
    return json(429, 'You’re sending messages quickly — please wait a few minutes.')
  }

  let state: ConversationState | null = null
  let token: string | null = null
  if (body.conversationId != null) {
    state = await loadConversation(body.conversationId, body.token)
  }
  if (kickoff && (!state || state.turns > 0 || !state.brief.intake)) return json(400, 'Chat not found.')
  if (!state) {
    if (await rateLimited('ai-new', AI_LIMITS.newChatsPerHour, 60 * 60 * 1000)) {
      return json(429, 'Too many new chats from this connection. Please try again later.')
    }
    const created = await createConversation(message, await clientIp())
    state = created.state
    token = created.token
  }
  const convo = state

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
      // Turns answered without the AI still go in the transcript the owner reads.
      const notice = (text: string) => {
        if (message) convo.transcript.push({ kind: 'user', id: transcriptId(), text: message })
        convo.transcript.push({ kind: 'notice', id: transcriptId(), text })
        emit({ type: 'notice', text, showContact: true })
      }
      if (token) emit({ type: 'session', conversationId: convo.id, token })
      try {
        if (convo.turns >= AI_LIMITS.maxTurns) {
          convo.status = 'capped'
          notice('We’ve covered a lot! To take this further, leave your number and our team will call you with a confirmed plan.')
        } else if (await overDailyCap()) {
          notice('Our planners are busy right now. Leave your number and the team will call you back today.')
        } else {
          const specialists = await loadSpecialists()
          if (kickoff) await runKickoff({ state: convo, specialists, emit })
          else await runTurn({ state: convo, userText: message, specialists, emit })
          await refreshLeadPlan(convo)
        }
      } catch (err) {
        console.error('[zenfest-ai] turn failed:', err instanceof Error ? err.message : err)
        if (err instanceof Error && /\b(401|403)\b/.test(err.message)) {
          console.error('[zenfest-ai] The AI provider rejected AI_API_KEY. Put a real key (Groq: console.groq.com → API Keys) in .env.local / Vercel and restart.')
        }
        // Free-tier quota used up (429) or the provider is down: still capture the lead.
        // Kept in the transcript so the owner can see failed turns in /admin.
        const text = isRateLimit(err)
          ? 'Our AI planners are busy right now. Leave your number and the team will call you back today.'
          : 'Something went wrong on our side. Leave your number and our team will call you, or try again in a moment.'
        convo.transcript.push({ kind: 'notice', id: transcriptId(), text })
        emit({ type: 'notice', text, showContact: true })
      } finally {
        try {
          await saveConversation(convo)
        } catch (err) {
          console.error('[zenfest-ai] could not save conversation:', err instanceof Error ? err.message : err)
        }
        emit({ type: 'done' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
