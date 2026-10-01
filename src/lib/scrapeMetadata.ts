// Server-only: fetches a product page and reads its title, image and price.
// Never import this from a client component (see CLAUDE.md).
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

import * as cheerio from 'cheerio'

import { detectMerchant } from './registryOptions'

export type LinkPreview = {
  url: string
  title: string
  imageUrl: string
  price: number | null
  merchant: string
  /** False when the store blocked us or the page had nothing usable. */
  complete: boolean
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const MAX_BYTES = 2_500_000
const MAX_REDIRECTS = 4

/** Hosts pasted links may resolve to that we must never fetch (SSRF guard). */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::') return true
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Only web links can be added.')
  if (url.username || url.password) throw new Error('That link is not supported.')
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error('That link is not supported.')
  }
  return url
}

/** Fetch with redirects followed by hand, re-checking every hop. */
async function fetchPage(raw: string): Promise<{ finalUrl: string; html: string }> {
  let current = raw
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current)
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-IN,en;q=0.9',
      },
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, url).toString()
      continue
    }
    if (!res.ok || !res.body) return { finalUrl: url.toString(), html: '' }

    // Read at most MAX_BYTES — product pages are big, but the <head> is all we need.
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      size += value.byteLength
    }
    await reader.cancel().catch(() => {})
    return { finalUrl: url.toString(), html: Buffer.concat(chunks).toString('utf8') }
  }
  throw new Error('Too many redirects.')
}

const toPrice = (text?: string | null): number | null => {
  if (!text) return null
  const n = Number(String(text).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

function jsonLdOffer($: cheerio.CheerioAPI): { name?: string; image?: string; price?: number | null } {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      const data = JSON.parse($(el).text())
      const nodes: unknown[] = Array.isArray(data) ? data : data?.['@graph'] ?? [data]
      type LdNode = { '@type'?: unknown; name?: string; image?: unknown; offers?: unknown }
      type Offer = { price?: string; lowPrice?: string } | undefined
      for (const node of nodes as LdNode[]) {
        if (!node || !String(node['@type']).includes('Product')) continue
        const offer = (Array.isArray(node.offers) ? node.offers[0] : node.offers) as Offer
        const image = (Array.isArray(node.image) ? node.image[0] : node.image) as string | { url?: string } | undefined
        return {
          name: node.name,
          image: typeof image === 'string' ? image : image?.url,
          price: toPrice(offer?.price ?? offer?.lowPrice),
        }
      }
    } catch {
      // Malformed JSON-LD is common; ignore it.
    }
  }
  return {}
}

/**
 * Best effort. Stores (Amazon especially) often block server requests, so this
 * returns whatever it found and the host edits the rest in the preview card.
 */
export async function scrapeMetadata(raw: string): Promise<LinkPreview> {
  const fallback: LinkPreview = {
    url: raw,
    title: '',
    imageUrl: '',
    price: null,
    merchant: detectMerchant(raw),
    complete: false,
  }

  let page: { finalUrl: string; html: string }
  try {
    page = await fetchPage(raw)
  } catch (err) {
    if (err instanceof Error && /not supported|Only web links/.test(err.message)) throw err
    return fallback
  }
  if (!page.html) return { ...fallback, url: page.finalUrl, merchant: detectMerchant(page.finalUrl) }

  const $ = cheerio.load(page.html)
  const meta = (...names: string[]) => {
    for (const n of names) {
      const v = $(`meta[property="${n}"], meta[name="${n}"], meta[itemprop="${n}"]`).first().attr('content')
      if (v?.trim()) return v.trim()
    }
    return ''
  }
  const ld = jsonLdOffer($)

  const fullTitle = (
    meta('og:title', 'twitter:title') ||
    ld.name ||
    $('#productTitle').text() ||
    $('title').text()
  )
    .replace(/\s+/g, ' ')
    .replace(/\s*[:|-]\s*(Amazon\.in|Flipkart\.com|Buy .*online.*)$/i, '')
    .trim()
  // Marketplace titles pack specs after " | " or " (": keep the product name.
  const title = (fullTitle.length > 70 ? fullTitle.split(/\s+\|\s+|\s+\(/)[0] : fullTitle).slice(0, 160)

  let imageUrl =
    meta('og:image', 'og:image:secure_url', 'twitter:image') ||
    ld.image ||
    $('#landingImage').attr('data-old-hires') ||
    $('#landingImage').attr('src') ||
    ''
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, page.finalUrl).toString()
    } catch {
      imageUrl = ''
    }
  }

  const price =
    toPrice(meta('product:price:amount', 'og:price:amount', 'price')) ??
    ld.price ??
    toPrice($('.a-price .a-offscreen').first().text()) ??
    toPrice($('.a-price-whole').first().text()) ??
    toPrice(page.html.match(/"(?:sellingPrice|finalPrice)"\s*:\s*\{?[^}]*?"?value"?\s*:\s*(\d+)/)?.[1]) ??
    null

  return {
    url: page.finalUrl,
    title,
    imageUrl: imageUrl.startsWith('https://') ? imageUrl : '',
    price,
    merchant: detectMerchant(page.finalUrl),
    complete: Boolean(title && imageUrl),
  }
}
