import type { CollectionAfterChangeHook } from 'payload'

import { PHOTO_SERVICES } from '../lib/vendorOptions'
import type { VendorApplication } from '../payload-types'

type PriceRow = { item: string; unit: 'session' | 'kg'; price: number; gstIncluded: boolean }

/**
 * When a marketplace vendor answers the detailed questionnaire from their
 * dashboard (requireVerifiedPhone stamps `vendor` on it), point their account
 * at it and, if their price card is still empty, start it from the prices they
 * just gave (photo session rates, cake flavours per kg) so they type them once.
 */
export const linkVendorApplication: CollectionAfterChangeHook<VendorApplication> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create' || !doc.vendor) return doc
  const vendorId = typeof doc.vendor === 'object' ? doc.vendor.id : doc.vendor
  try {
    const vendor = await req.payload.findByID({
      collection: 'vendors',
      id: vendorId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const rows: PriceRow[] = []
    for (const rate of doc.photography?.rates ?? []) {
      const label = PHOTO_SERVICES.find(([v]) => v === rate.service)?.[1]
      if (label && rate.sessionPrice) {
        rows.push({ item: label, unit: 'session', price: rate.sessionPrice, gstIncluded: true })
      }
    }
    for (const f of doc.cake?.flavours ?? []) {
      if (f.flavour && f.ratePerKg) {
        rows.push({ item: `${f.flavour} cake`, unit: 'kg', price: f.ratePerKg, gstIncluded: true })
      }
    }
    await req.payload.update({
      collection: 'vendors',
      id: vendorId,
      data: {
        application: doc.id,
        ...(!vendor.priceCard?.length && rows.length ? { priceCard: rows } : {}),
      },
      overrideAccess: true,
      req,
    })
  } catch (err) {
    req.payload.logger.warn(
      `[linkVendorApplication] Could not link application ${doc.id} to vendor ${vendorId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
  return doc
}
