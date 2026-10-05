import { NextResponse, type NextRequest } from 'next/server'

import { toAffiliateUrl } from '../../../../../lib/affiliate'
import { getPayloadClient } from '../../../../../lib/payload'
import { findLiveProductById } from '../../../../../lib/shop'

/**
 * "Buy on Amazon ↗" for a shop product: logs the click, adds the affiliate tag
 * (lib/affiliate.ts) and redirects. Seller products have no store link, so they
 * go back to their product page.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id)
  const product = Number.isInteger(id) ? await findLiveProductById(id) : null
  if (!product) return NextResponse.redirect(new URL('/shop', req.url))
  if (product.source !== 'affiliate' || !product.affiliateUrl) {
    return NextResponse.redirect(new URL(`/shop/p/${product.slug}`, req.url))
  }

  const target = toAffiliateUrl(product.affiliateUrl)
  const payload = await getPayloadClient()
  await payload
    .create({
      collection: 'registry-clicks',
      data: {
        product: product.id,
        merchant: product.merchant || '',
        // Same link with no affiliate settings → not tagged.
        affiliated: target !== toAffiliateUrl(product.affiliateUrl, {}),
      },
      overrideAccess: true,
    })
    .catch(() => {}) // never block the buyer on analytics

  const res = NextResponse.redirect(target, 302)
  res.headers.set('Referrer-Policy', 'no-referrer')
  res.headers.set('X-Robots-Tag', 'noindex')
  return res
}
