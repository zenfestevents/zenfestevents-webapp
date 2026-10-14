// npm run check:whatsapp [site-url] — a read-only health check of the LIVE WhatsApp
// setup. Sends no messages. Needs in .env (or the shell): WHATSAPP_ACCESS_TOKEN,
// WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN; optional WHATSAPP_WABA_ID.
// Checks: the website answers Meta's webhook handshake, the number is connected
// and healthy, our app is subscribed to the account, which templates are approved.
import 'dotenv/config'

const site = (process.argv[2] || 'https://www.zenfestevents.in').replace(/\/$/, '')
const token = process.env.WHATSAPP_ACCESS_TOKEN
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1424189764102540'
const wabaId = process.env.WHATSAPP_WABA_ID || '4489772861336046'
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
const graph = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || 'v26.0'}`

let problems = 0
const ok = (msg: string) => console.log(`  ✓ ${msg}`)
const bad = (msg: string) => {
  problems++
  console.log(`  ✗ ${msg}`)
}
const note = (msg: string) => console.log(`    ${msg}`)

async function getGraph(path: string) {
  const res = await fetch(`${graph}/${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const data = (await res.json().catch(() => ({}))) as Record<string, any>
  if (!res.ok) throw new Error(`${data.error?.code ?? res.status}: ${data.error?.message ?? 'request failed'}`)
  return data
}

console.log(`\nWhatsApp health check — ${site}\n`)

// 1. Webhook handshake (what "Verify and save" in Meta does)
console.log('Webhook')
if (!verifyToken) {
  bad('WHATSAPP_VERIFY_TOKEN is not set here, so the handshake can\'t be tested.')
} else {
  const challenge = `check-${Date.now()}`
  const url = `${site}/api/phone-verifications/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=${challenge}`
  try {
    const res = await fetch(url)
    const body = await res.text()
    if (res.ok && body === challenge) ok('the website answers Meta\'s handshake with this verify token')
    else bad(`handshake failed (HTTP ${res.status}). The verify token on the website differs, or it wasn't redeployed.`)
  } catch (err) {
    bad(`the website could not be reached: ${err instanceof Error ? err.message : err}`)
  }
}
const unsigned = await fetch(`${site}/api/phone-verifications/webhook`, { method: 'POST', body: '{}' }).catch(() => null)
if (unsigned?.status === 401) ok('unsigned (fake) webhook calls are rejected')
else bad(`unsigned webhook call got HTTP ${unsigned?.status ?? 'no answer'} (expected 401)`)

if (!token) {
  bad('WHATSAPP_ACCESS_TOKEN is not set here, so Meta can\'t be checked. Add it to .env (never commit it).')
  console.log(`\n${problems} problem(s).`)
  process.exit(1)
}

// 2. The phone number
console.log('\nPhone number')
try {
  const p = await getGraph(
    `${phoneId}?fields=display_phone_number,verified_name,name_status,code_verification_status,quality_rating,platform_type,status,messaging_limit_tier`,
  )
  ok(`${p.display_phone_number} — "${p.verified_name}"`)
  note(`connection: ${p.platform_type ?? '?'} · status: ${p.status ?? '?'} · quality: ${p.quality_rating ?? '?'}`)
  note(`display name: ${p.name_status ?? '?'} · number verified: ${p.code_verification_status ?? '?'}`)
  note(`daily limit tier: ${p.messaging_limit_tier ?? '?'}`)
  if (p.platform_type && p.platform_type !== 'CLOUD_API') bad('the number is not on the Cloud API')
  if (p.status && !['CONNECTED', 'ONLINE'].includes(String(p.status))) bad(`the number's status is ${p.status}`)
  if (p.quality_rating === 'RED') bad('quality rating is RED: too many blocks/reports, slow down campaigns')
} catch (err) {
  bad(`could not read the number: ${err instanceof Error ? err.message : err}`)
}

// 3. Our app is subscribed to the WhatsApp account (otherwise no webhooks arrive)
console.log('\nWhatsApp Business Account')
try {
  const w = await getGraph(`${wabaId}?fields=name,account_review_status,business_verification_status`)
  ok(`"${w.name}" (${wabaId})`)
  note(`account review: ${w.account_review_status ?? '?'} · business verification: ${w.business_verification_status ?? '?'}`)
} catch (err) {
  bad(`could not read the account: ${err instanceof Error ? err.message : err}`)
}
try {
  const s = await getGraph(`${wabaId}/subscribed_apps`)
  const apps = (s.data ?? []) as { whatsapp_business_api_data?: { name?: string } }[]
  if (apps.length) ok(`webhooks subscribed: ${apps.map((a) => a.whatsapp_business_api_data?.name ?? 'app').join(', ')}`)
  else bad('no app is subscribed to this WhatsApp account, so messages will not reach the website. Turn on "Subscribe webhooks".')
} catch (err) {
  bad(`could not read subscriptions: ${err instanceof Error ? err.message : err}`)
}

// 4. Templates
console.log('\nMessage templates')
try {
  const t = await getGraph(`${wabaId}/message_templates?fields=name,status,category,language&limit=100`)
  const list = (t.data ?? []) as { name: string; status: string; category: string; language: string }[]
  if (!list.length) note('none yet — create them in WhatsApp Manager')
  for (const x of list) {
    const line = `${x.name} (${x.language}, ${x.category.toLowerCase()}) — ${x.status}`
    if (x.status === 'APPROVED') ok(line)
    else note(line)
  }
} catch (err) {
  bad(`could not read templates: ${err instanceof Error ? err.message : err}`)
}

console.log(problems ? `\n${problems} problem(s) found.` : '\nWhatsApp looks healthy ✓')
process.exit(problems ? 1 : 0)
