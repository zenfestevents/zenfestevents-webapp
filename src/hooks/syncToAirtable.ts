import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

import { PHOTO_EDITING, PHOTO_SERVICES, photoServiceLabel } from '../lib/vendorOptions'
import type { VendorApplication } from '../payload-types'
import { syncCakeToAirtable } from './syncCakeToAirtable'

type Rate = { service?: string | null; sessionPrice?: number | null; camera?: string | null }

/**
 * Copies each new vendor application into Airtable: photography into the base
 * in the "Photo" workspace, cakes into the Cake Vendors base (see
 * syncCakeToAirtable). Fails softly like notifySubmission: the application is
 * already saved in our DB, so a missing token or an Airtable error only logs.
 */
export const syncToAirtable: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  if (doc?.vendorType === 'photography') await syncPhotoToAirtable(doc, req)
  if (doc?.vendorType === 'cake') await syncCakeToAirtable(doc, req)
  return doc
}

/**
 * One row per application, dated. Env: AIRTABLE_TOKEN (PAT with
 * data.records:write on the base), AIRTABLE_PHOTO_BASE_ID, AIRTABLE_PHOTO_TABLE
 * (default "Vendor Applications"). Column names must match
 * docs/airtable/photo-vendors.csv; `typecast` lets Airtable create select
 * options on the fly.
 */
async function syncPhotoToAirtable(doc: VendorApplication, req: PayloadRequest) {
  const token = process.env.AIRTABLE_TOKEN
  const baseId = process.env.AIRTABLE_PHOTO_BASE_ID
  const table = process.env.AIRTABLE_PHOTO_TABLE || 'Vendor Applications'
  if (!token || !baseId) {
    req.payload.logger.info(
      `[syncToAirtable] AIRTABLE_TOKEN / AIRTABLE_PHOTO_BASE_ID not set — skipped Airtable for "${doc.name}".`,
    )
    return
  }

  const photo = doc.photography ?? {}
  const rates: Rate[] = photo.rates ?? []
  const editing: string[] = photo.editing ?? []

  const fields: Record<string, unknown> = {
    // Submission date in India time, as YYYY-MM-DD for Airtable's Date field.
    Date: new Date(doc.createdAt ?? Date.now()).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    }),
    Name: doc.name,
    'Business name': doc.businessName ?? '',
    Phone: doc.phone,
    'Phone verified': doc.phoneVerified ? 'Yes' : 'No',
    Area: doc.city ?? '',
    Coverage:
      photo.coverage === 'all' ? 'All services' : `${photoServiceLabel(photo.specialty)} only`,
    'Album design': labelsFor(editing, 'album'),
    'Video editing': labelsFor(editing, 'video'),
    Portfolio: doc.portfolioUrl ?? '',
    Notes: doc.message ?? '',
    Status: 'New',
  }
  for (const [value, label] of PHOTO_SERVICES) {
    const rate = rates.find((r) => r.service === value)
    if (!rate) continue
    if (rate.sessionPrice != null) fields[`${label} – price`] = rate.sessionPrice
    if (rate.camera) fields[`${label} – camera`] = rate.camera
  }

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ fields }], typecast: true }),
      },
    )
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  } catch (err) {
    req.payload.logger.warn(
      `[syncToAirtable] Could not add "${doc.name}" to Airtable (saved to DB regardless): ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

/** "Traditional, Candid" for the album or video editing picks; blank when none. */
function labelsFor(editing: string[], kind: 'album' | 'video') {
  return PHOTO_EDITING.filter(([v]) => v.startsWith(kind) && editing.includes(v))
    .map(([v]) => (v.endsWith('traditional') ? 'Traditional' : 'Candid'))
    .join(', ')
}
