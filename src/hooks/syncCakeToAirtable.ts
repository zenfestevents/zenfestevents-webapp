import { getFileByPath, type PayloadRequest } from 'payload'

import type { VendorApplication, VendorUpload } from '../payload-types'
import { TIER_UNITS, optionLabel } from '../lib/vendorOptions'

/**
 * Adds a cake application to the Cake Vendors base, laid out like the rows the
 * team enters by hand after the intake call: one "Vendors" row (Status "To
 * Call") with the FSSAI certificate attached, plus one "Flavour Prices" row per
 * flavour. Field names and dropdown choices mirror that base — rename a column
 * there and it must be renamed here too.
 *
 * Env: AIRTABLE_TOKEN (PAT with data.records:write on the base),
 * AIRTABLE_CAKE_BASE_ID. Skipped with a log line when either is missing.
 */
export async function syncCakeToAirtable(doc: VendorApplication, req: PayloadRequest) {
  const token = process.env.AIRTABLE_TOKEN
  const baseId = process.env.AIRTABLE_CAKE_BASE_ID
  if (!token || !baseId) {
    req.payload.logger.info(
      `[syncToAirtable] AIRTABLE_TOKEN / AIRTABLE_CAKE_BASE_ID not set — skipped Airtable for "${doc.name}".`,
    )
    return
  }
  const cake = doc.cake ?? {}
  const vendorName = doc.businessName || doc.name
  const api = (table: string) => `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Answers that have no column of their own go into Risk Notes, so nothing is lost.
  const notes = ['Applied through the website.']
  if (doc.phoneVerified) notes.push('Phone verified on WhatsApp.')
  if (cake.egglessUnit === 'none') notes.push("Doesn't offer eggless.")
  if (cake.wheatUnit === 'none') notes.push("Doesn't offer wheat / atta.")
  if (cake.tierUnit === 'none') notes.push("Doesn't make tier cakes.")
  else if (cake.tierUnit) notes.push(`Tier charge is ${optionLabel(TIER_UNITS, cake.tierUnit).toLowerCase()} (add-on vs floor rate not asked yet).`)
  if (cake.customUnit === 'none') notes.push("Doesn't make custom cakes.")
  else if (cake.customUnit === 'per-kg') notes.push('Custom theme charge is per kg (add-on vs floor rate not asked yet).')
  if (cake.menu) notes.push('Full menu card uploaded — see Vendor Uploads in the website admin.')
  if (doc.message) notes.push(`Vendor's note: ${doc.message}`)

  const delivery = [
    cake.deliveryRates?.trim(),
    cake.deliveryRadiusKm ? `delivers up to ${cake.deliveryRadiusKm} km` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const fields: Record<string, unknown> = {
    'Vendor Name': vendorName,
    Status: 'To Call',
    Area: doc.city ?? undefined,
    Phone: `+91 ${doc.phone}`,
    Instagram: doc.portfolioUrl ?? undefined,
    'FSSAI Number': cake.fssaiNumber ?? undefined,
    'Eggless Charge': money(cake.egglessCharge, cake.egglessUnit),
    'Eggless Unit': surchargeUnit(cake.egglessUnit),
    'Wheat Charge': money(cake.wheatCharge, cake.wheatUnit),
    'Wheat Unit': surchargeUnit(cake.wheatUnit),
    'Tier 2kg Charge': cake.tierUnit === 'none' ? undefined : (cake.tier2kgCharge ?? undefined),
    'Tier 3kg Charge': cake.tierUnit === 'none' ? undefined : (cake.tier3kgCharge ?? undefined),
    'Custom Theme Charge': cake.customUnit === 'none' ? undefined : (cake.customCharge ?? undefined),
    'Custom Charge Type': cake.customUnit === 'per-cake' ? 'Per cake' : undefined,
    'Min Order': cake.minOrder === 'half-kg' ? 'Half kg' : cake.minOrder === '1kg' ? '1 kg' : undefined,
    'Lead Time Normal': days(cake.leadNormalDays),
    'Lead Time Custom': days(cake.leadCustomDays),
    Delivery: 'Delivers',
    'Delivery Charge': delivery || undefined,
    'Venue Serving': cake.venueServing === 'yes' ? 'Yes' : cake.venueServing === 'no' ? 'No' : undefined,
    'Risk Notes': notes.join('\n'),
    'Date Collected': new Date(doc.createdAt ?? Date.now()).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    }),
  }

  try {
    const res = await fetch(api(process.env.AIRTABLE_CAKE_VENDORS_TABLE || 'Vendors'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ records: [{ fields: stripEmpty(fields) }], typecast: true }),
    })
    if (!res.ok) throw new Error(`Vendors: ${res.status} ${await res.text()}`)
    const recordId: string = (await res.json()).records[0].id

    // Flavour Prices: one row each, 10 per request (Airtable's batch limit).
    const flavours = (cake.flavours ?? []).filter((f) => f.flavour?.trim())
    for (let i = 0; i < flavours.length; i += 10) {
      const batch = flavours.slice(i, i + 10).map((f) => ({
        fields: stripEmpty({ Flavour: f.flavour, 'Vendor Name': vendorName, 'Rate 1kg': f.ratePerKg }),
      }))
      const r = await fetch(api(process.env.AIRTABLE_CAKE_FLAVOURS_TABLE || 'Flavour Prices'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ records: batch, typecast: true }),
      })
      if (!r.ok) throw new Error(`Flavour Prices: ${r.status} ${await r.text()}`)
    }

    await attachCertificate(req, baseId, token, recordId, cake.fssaiCertificate)
  } catch (err) {
    req.payload.logger.warn(
      `[syncToAirtable] Could not add cake vendor "${vendorName}" to Airtable (saved to DB regardless): ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

/**
 * Uploads the FSSAI certificate into the Vendors row's "FSSAI Certificate"
 * attachment field. Our copy is private, so Airtable can't fetch it by URL —
 * we send the bytes (Airtable's uploadAttachment takes up to 5 MB).
 */
async function attachCertificate(
  req: PayloadRequest,
  baseId: string,
  token: string,
  recordId: string,
  upload: number | VendorUpload | null | undefined,
) {
  if (!upload) return
  const file: VendorUpload =
    typeof upload === 'object'
      ? upload
      : await req.payload.findByID({ collection: 'vendor-uploads', id: upload, overrideAccess: true, req })
  if (!file.filename) return
  const bytes = await readUploadBytes(req, file)
  const res = await fetch(
    `https://content.airtable.com/v0/${baseId}/${recordId}/${encodeURIComponent('FSSAI Certificate')}/uploadAttachment`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: file.mimeType || 'application/octet-stream',
        file: bytes.toString('base64'),
        filename: file.filename,
      }),
    },
  )
  if (!res.ok) throw new Error(`FSSAI Certificate upload: ${res.status} ${await res.text()}`)
}

/**
 * The stored bytes of a vendor upload, wherever it lives: through the storage
 * adapter's handlers (Vercel Blob in production), else the local upload folder.
 */
async function readUploadBytes(req: PayloadRequest, file: VendorUpload): Promise<Buffer> {
  const config = req.payload.collections['vendor-uploads'].config
  for (const handler of config.upload?.handlers ?? []) {
    const res = await handler(req, {
      doc: file,
      params: { collection: 'vendor-uploads', filename: file.filename! },
    })
    if (res instanceof Response && res.ok) return Buffer.from(await res.arrayBuffer())
  }
  // Local disk (dev). Go through Payload's helper rather than fs + path.resolve:
  // a runtime-built path makes Next's file tracing bundle the whole project
  // (hero videos included) into every function — that pushed each one past
  // Vercel's 250 MB limit and failed the deploy.
  const local = await getFileByPath(`${config.upload.staticDir || 'vendor-uploads'}/${file.filename}`)
  if (!local) throw new Error(`Couldn't read ${file.filename}`)
  return local.data
}

/** Airtable's "Eggless Unit" / "Wheat Unit" choice ("Don't offer" goes to Risk Notes). */
function surchargeUnit(unit?: string | null) {
  return ({ 'per-kg': 'Per kg', flat: 'Flat per cake', nil: 'Nil' } as Record<string, string>)[unit ?? '']
}

/** The rupee charge, or 0 when they said "no extra charge". */
function money(amount?: number | null, unit?: string | null) {
  if (unit === 'nil') return 0
  if (unit === 'none') return undefined
  return amount ?? undefined
}

function days(n?: number | null) {
  return n == null ? undefined : `${n} day${n === 1 ? '' : 's'}`
}

function stripEmpty(fields: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}
