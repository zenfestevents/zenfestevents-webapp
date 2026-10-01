/**
 * Turns a merchant link into an affiliate link. Server-only in practice (it
 * reads env), but has no server imports so it stays easy to test.
 *
 * The link is converted when a guest is redirected (`/r/[slug]/go/[itemId]`),
 * not when the host saves the item — so adding the affiliate IDs later applies
 * to every registry that already exists.
 *
 * - Amazon India: adds `tag=AMAZON_ASSOCIATE_TAG`.
 * - Everything else: wrapped with `AFFILIATE_REDIRECT_TEMPLATE` (Cuelinks,
 *   EarnKaro or similar), where `{url}` is replaced by the encoded link.
 * - With neither set, the link goes to the store unchanged.
 */
const AMAZON_HOSTS = ['amazon.in', 'amzn.in', 'amzn.to']

export function toAffiliateUrl(
  url: string,
  env: { amazonTag?: string; redirectTemplate?: string } = {
    amazonTag: process.env.AMAZON_ASSOCIATE_TAG,
    redirectTemplate: process.env.AFFILIATE_REDIRECT_TEMPLATE,
  },
): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (!/^https?:$/.test(parsed.protocol)) return url

  const host = parsed.hostname.replace(/^www\./, '')
  const isAmazon = AMAZON_HOSTS.some((d) => host === d || host.endsWith(`.${d}`))

  if (isAmazon) {
    if (!env.amazonTag) return parsed.toString()
    parsed.searchParams.set('tag', env.amazonTag)
    return parsed.toString()
  }

  const template = env.redirectTemplate?.trim()
  if (template && template.includes('{url}')) {
    return template.replace('{url}', encodeURIComponent(parsed.toString()))
  }
  return parsed.toString()
}
