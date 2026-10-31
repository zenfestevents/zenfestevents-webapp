import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import { formatItemCode, itemCodePrefix } from '../lib/decorOptions'
import { slugify } from '../lib/formCheck'

type PriceField = 'clientPrice' | 'vendorPrice'
type PriceChange = { field: PriceField; oldPrice: number | null; newPrice: number | null }

const PRICE_FIELDS: PriceField[] = ['clientPrice', 'vendorPrice']
/** Where beforeChange leaves the price changes for afterChange (which knows the new id). */
const CHANGES_KEY = 'decorPriceChanges'

const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

/**
 * On create: gives the item its code (WED-STG-014 = event type + category + the next
 * running number for that pair) and its web address. Codes never change afterwards, even
 * if the event type or category is edited, because old quotes refer to them.
 * The unique index on `itemCode` catches two items saved at the same instant; the second
 * save fails and simply needs saving again.
 */
export const assignItemCode: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || data.itemCode) return data
  const prefix = itemCodePrefix(data.eventType, data.category)
  const { docs } = await req.payload.find({
    collection: 'decor-items',
    where: { itemCode: { like: prefix } },
    select: { itemCode: true },
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  let max = 0
  for (const d of docs) {
    const code = String(d.itemCode ?? '')
    if (!code.startsWith(prefix)) continue
    const n = Number(code.slice(prefix.length))
    if (Number.isInteger(n) && n > max) max = n
  }
  data.itemCode = formatItemCode(prefix, max + 1)
  if (!data.slug) {
    const base = slugify(String(data.title || '')).slice(0, 60).replace(/-+$/, '')
    data.slug = [base, data.itemCode.toLowerCase()].filter(Boolean).join('-')
  }
  return data
}

/**
 * Stamps `priceUpdatedOn` whenever the client or vendor price changes (or is first set)
 * and remembers the change for `recordPriceHistory`.
 */
export const stampPriceChange: CollectionBeforeChangeHook = ({ data, originalDoc, operation, context }) => {
  const changes: PriceChange[] = []
  for (const field of PRICE_FIELDS) {
    // A partial update that leaves a price out keeps the old one.
    if (operation === 'update' && !(field in data)) continue
    const oldPrice = operation === 'update' ? num(originalDoc?.[field]) : null
    const newPrice = num(data[field])
    if (oldPrice !== newPrice) changes.push({ field, oldPrice, newPrice })
  }
  if (changes.length) data.priceUpdatedOn = new Date().toISOString()
  context[CHANGES_KEY] = changes
  return data
}

/** One `decor-price-history` row per changed price, in the same transaction as the save. */
export const recordPriceHistory: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  const changes = (context[CHANGES_KEY] as PriceChange[] | undefined) ?? []
  context[CHANGES_KEY] = []
  for (const c of changes) {
    await req.payload.create({
      collection: 'decor-price-history',
      data: {
        item: doc.id,
        itemCode: doc.itemCode,
        field: c.field === 'clientPrice' ? 'client' : 'vendor',
        oldPrice: c.oldPrice,
        newPrice: c.newPrice,
        changedOn: new Date().toISOString(),
        changedBy: req.user?.collection === 'users' ? req.user.id : undefined,
      },
      overrideAccess: true,
      req,
    })
  }
  return doc
}
