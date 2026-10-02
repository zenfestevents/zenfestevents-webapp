// Server-only Zenfest AI settings: provider, models, effort, limits and prices.
// Any OpenAI-compatible host works (Groq by default; also OpenRouter, Together,
// Ollama, vLLM), so switching provider or model is an env change, not a code change.

export type AiRole = 'coordinator' | 'specialist'

const env = (name: string) => process.env[name]?.trim() || ''

/**
 * Open models on Groq, chosen by testing real chats (2026-10-02):
 * - coordinator: Alibaba's Qwen 3.8 27B — fastest, most natural Tamil/Tanglish, routes
 *   to specialists straight away. It is a Groq *preview* model, so GPT-OSS-120B is the
 *   automatic fallback when it is unavailable or its free quota is used up.
 * - specialists: OpenAI's GPT-OSS-120B — the 20B version mixed up options, ignored
 *   budgets and wrote poorer Tamil.
 * Override any of these with AI_*_MODEL.
 */
const DEFAULTS = {
  baseURL: 'https://api.groq.com/openai/v1',
  coordinator: 'qwen/qwen3.8-27b',
  coordinatorFallback: 'openai/gpt-oss-120b',
  specialist: 'openai/gpt-oss-120b',
}

export type ProviderSettings = { baseURL: string; apiKey: string; model: string }

/** Model Zenfest switches to when its own model fails or is rate-limited ('' = none). */
export function coordinatorFallbackModel(): string {
  const v = process.env.AI_COORDINATOR_FALLBACK_MODEL
  return v === undefined ? DEFAULTS.coordinatorFallback : v.trim()
}

/** Connection for one role. Specialists may use a second provider (AI_SPECIALIST_BASE_URL / _API_KEY). */
export function providerFor(role: AiRole): ProviderSettings {
  const baseURL = env('AI_BASE_URL') || DEFAULTS.baseURL
  const apiKey = env('AI_API_KEY')
  if (role === 'coordinator') {
    return { baseURL, apiKey, model: env('AI_COORDINATOR_MODEL') || DEFAULTS.coordinator }
  }
  return {
    baseURL: env('AI_SPECIALIST_BASE_URL') || baseURL,
    apiKey: env('AI_SPECIALIST_API_KEY') || apiKey,
    model: env('AI_SPECIALIST_MODEL') || DEFAULTS.specialist,
  }
}

/** Reasoning effort for models that support it (GPT-OSS: low / medium / high). */
export const ZENFEST_EFFORT = {
  coordinator: 'medium',
  specialist: 'low',
} as const

/**
 * `reasoning_effort` for the request, only on GPT-OSS: other models (Qwen, Llama)
 * take different values or reject the field, so it is left out for them.
 */
export function effortParam(model: string, role: AiRole): { reasoning_effort?: 'low' | 'medium' } {
  if (/gpt-oss/i.test(model)) return { reasoning_effort: ZENFEST_EFFORT[role] }
  // Qwen on Groq prints its <think> reasoning into the reply unless told to hide it.
  if (/qwen/i.test(model) && /groq\.com/.test(providerFor(role).baseURL)) {
    return { reasoning_format: 'hidden' } as { reasoning_effort?: 'low' | 'medium' }
  }
  return {}
}

export const AI_LIMITS = {
  /** Customer messages per conversation. */
  maxTurns: 30,
  /** Specialists Zenfest may consult while answering one message. */
  maxSpecialistCallsPerTurn: 6,
  /** Model round-trips (tool loop iterations) per customer message. */
  maxLoopsPerTurn: 4,
  /** Per IP. */
  messagesPerWindow: 20,
  messageWindowMs: 10 * 60 * 1000,
  newChatsPerHour: 5,
}

/** Daily spend cap in USD, summed from ai-conversations; env ZENFEST_AI_DAILY_USD_CAP. */
export function dailyCapUsd(): number {
  const raw = env('ZENFEST_AI_DAILY_USD_CAP')
  const v = Number(raw)
  return raw !== '' && Number.isFinite(v) && v >= 0 ? v : 5
}

/**
 * The AI runs only when a key is set (AI_API_KEY), or a key-less local server
 * (AI_BASE_URL pointing at localhost, e.g. Ollama). Otherwise every entry point
 * falls back to /contact.
 */
export function aiConfigured(): boolean {
  if (env('AI_API_KEY')) return true
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(env('AI_BASE_URL') + '/')
}

// USD per million tokens (Groq list prices; free tier costs nothing). Unknown
// models count as 0, so the daily cap only bites on models priced here.
const PRICES: Record<string, { input: number; output: number }> = {
  'openai/gpt-oss-120b': { input: 0.15, output: 0.6 },
  'openai/gpt-oss-20b': { input: 0.075, output: 0.3 },
  // Approximate (Groq lists it per dollar): ~1.3M input / ~250K output tokens per $1.
  'qwen/qwen3.8-27b': { input: 0.77, output: 4 },
}

export type UsageTotals = { inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number }

export const emptyUsage = (): UsageTotals => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUsd: 0 })

type OpenAIUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  prompt_tokens_details?: { cached_tokens?: number | null } | null
} | null | undefined

/** Adds one response's usage (OpenAI-style `usage`). */
export function addUsage(total: UsageTotals, model: string, usage: OpenAIUsage): UsageTotals {
  if (!usage) return total
  const p = PRICES[model] ?? { input: 0, output: 0 }
  const input = usage.prompt_tokens ?? 0
  const output = usage.completion_tokens ?? 0
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0
  return {
    inputTokens: total.inputTokens + input,
    outputTokens: total.outputTokens + output,
    cacheReadTokens: total.cacheReadTokens + cached,
    costUsd: total.costUsd + (input * p.input + output * p.output) / 1e6,
  }
}
