// Server-only: sending through the WhatsApp Cloud API. Don't import from client components.

// v26.0 (Jul 2026); Meta retires each version ~2 years after release.
const graphVersion = () => process.env.WHATSAPP_GRAPH_VERSION || 'v26.0'

/** True when the app can send (access token + phone number id are set). */
export function cloudConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string }

async function send(message: Record<string, unknown>): Promise<SendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp sending is not set up (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).' }
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...message }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[]
      error?: { code?: number; message?: string; error_data?: { details?: string } }
    }
    const id = data.messages?.[0]?.id
    if (res.ok && id) return { ok: true, id }
    const e = data.error
    return { ok: false, error: `${e?.code ?? res.status}: ${e?.error_data?.details || e?.message || 'Unknown error'}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Free-form text. Only delivered inside the 24-hour window after the person's last message. */
export function sendText(to: string, body: string) {
  return send({ to, type: 'text', text: { body, preview_url: false } })
}

export type TemplateMessage = {
  name: string
  language: string
  /** Public image URL, for templates with an image header. */
  headerImage?: string | null
  /** Values for {{1}}, {{2}}, … in the template body, in order. */
  bodyParams?: string[]
}

/** An approved template — the only kind of message allowed outside the 24-hour window. */
export function sendTemplate(to: string, t: TemplateMessage) {
  const components: Record<string, unknown>[] = []
  if (t.headerImage) {
    components.push({ type: 'header', parameters: [{ type: 'image', image: { link: t.headerImage } }] })
  }
  if (t.bodyParams?.length) {
    components.push({ type: 'body', parameters: t.bodyParams.map((text) => ({ type: 'text', text })) })
  }
  return send({
    to,
    type: 'template',
    template: { name: t.name, language: { code: t.language }, ...(components.length ? { components } : {}) },
  })
}
