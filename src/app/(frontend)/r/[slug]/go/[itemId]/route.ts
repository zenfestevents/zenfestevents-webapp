import { NextResponse, type NextRequest } from 'next/server'

import { toAffiliateUrl } from '../../../../../../lib/affiliate'
import { getPayloadClient } from '../../../../../../lib/payload'
import { findEvent } from '../../../../../../lib/registry'
import { findLiveProductById } from '../../../../../../lib/shop'

/**
 * Sends a guest to the store for a registry gift: logs the click, adds the
 * affiliate tag (lib/affiliate.ts) and redirects. Opened in a new tab after
 * "I'll gift this", and from "Open store" on an already-claimed gift.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string; itemId: string }> }) {
  const { slug, itemId } = await ctx.params
  const back = new URL(`/r/${encodeURIComponent(slug)}`, _req.url)

  const event = await findEvent(slug)
  const id = Number(itemId)
  if (!event || !Number.isInteger(id)) return NextResponse.redirect(back)

  const payload = await getPayloadClient()
  const item = await payload
    .findByID({ collection: 'registry-items', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  const owner = item && (typeof item.event === 'object' ? item.event.id : item.event)
  if (!item || owner !== event.id || !item.originalUrl) return NextResponse.redirect(back)

  // Added from the Zenfest Shop: buy where the product is sold — its partner
  // store (tagged) or, for a seller's product, its page in our shop.
  let storeUrl = item.originalUrl
  if (item.product) {
    const productId = typeof item.product === 'object' ? item.product.id : item.product
    const product = await findLiveProductById(productId)
    if (!product || product.source !== 'affiliate' || !product.affiliateUrl) {
      return NextResponse.redirect(new URL(product ? `/shop/p/${product.slug}` : '/shop', _req.url))
    }
    storeUrl = product.affiliateUrl
  }

  const target = toAffiliateUrl(storeUrl)
  await payload
    .create({
      collection: 'registry-clicks',
      data: {
        item: item.id,
        event: event.id,
        product: typeof item.product === 'object' ? item.product?.id : item.product,
        merchant: item.merchant || '',
        // Same link with no affiliate settings → not tagged.
        affiliated: target !== toAffiliateUrl(storeUrl, {}),
      },
      overrideAccess: true,
    })
    .catch(() => {}) // never block the guest on analytics

  const res = NextResponse.redirect(target, 302)
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('X-Robots-Tag', 'noindex')
  return res
}
