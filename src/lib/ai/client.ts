// Server-only: one OpenAI-compatible client per role (Groq by default).
import OpenAI from 'openai'

import { providerFor, type AiRole } from './config'

const clients = new Map<string, OpenAI>()

export function aiClient(role: AiRole): { client: OpenAI; model: string } {
  const { baseURL, apiKey, model } = providerFor(role)
  const key = `${baseURL}|${apiKey}`
  let client = clients.get(key)
  if (!client) {
    // Local servers (Ollama) ignore the key but the SDK insists on one.
    client = new OpenAI({ baseURL, apiKey: apiKey || 'local', maxRetries: 1, timeout: 45_000 })
    clients.set(key, client)
  }
  return { client, model }
}

/** True for "free tier used up / too many requests" errors from the provider. */
export function isRateLimit(err: unknown): boolean {
  return err instanceof OpenAI.RateLimitError || (err instanceof OpenAI.APIError && err.status === 429)
}
