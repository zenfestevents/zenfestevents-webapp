'use client'

import React, { useEffect, useState } from 'react'

import {
  CUSTOM_UNITS,
  MIN_FLAVOURS,
  MIN_ORDERS,
  SURCHARGE_UNITS,
  TIER_UNITS,
} from '../lib/vendorOptions'
import { Radios, num, str } from './FormChoices'

/** Matches VENDOR_UPLOAD_MAX_BYTES in collections/VendorUploads.ts. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf'

/**
 * The cake questions: the "Approved 10" from the Cake Vendors Airtable base.
 * FSSAI registration and delivery come first because they're hard filters —
 * a baker without either is asked to come back once they have it, and the
 * rest of the questions (and the submit button) stay hidden.
 */
export function CakeFields({ onBlockedChange }: { onBlockedChange: (blocked: boolean) => void }) {
  const [hasFssai, setHasFssai] = useState('')
  const [delivers, setDelivers] = useState('')
  const [flavourRows, setFlavourRows] = useState(MIN_FLAVOURS)

  const missing = [
    hasFssai === 'no' && 'an FSSAI registration',
    delivers === 'no' && 'delivery to the venue',
  ].filter(Boolean) as string[]
  const blocked = missing.length > 0
  const passed = hasFssai === 'yes' && delivers === 'yes'

  useEffect(() => {
    onBlockedChange(blocked)
  }, [blocked, onBlockedChange])
  // Leaving the cake section (another vendor type) must not keep the form locked.
  useEffect(() => () => onBlockedChange(false), [onBlockedChange])

  return (
    <fieldset className="form__section">
      <legend className="form__section-title">Cake details</legend>

      <p className="field__hint">
        Two must-haves first: we only partner with bakers who are FSSAI registered and
        deliver cakes to the venue.
      </p>
      <Radios
        name="hasFssai"
        legend="Do you have an FSSAI registration?"
        required
        onChange={setHasFssai}
        options={[
          ['yes', 'Yes'],
          ['no', 'Not yet'],
        ]}
      />
      <Radios
        name="delivers"
        legend="Do you deliver cakes to the venue?"
        required
        onChange={setDelivers}
        options={[
          ['yes', 'Yes, we deliver'],
          ['no', 'No, pickup only'],
        ]}
      />

      {blocked && (
        <div className="cake-gate" role="status">
          <p className="cake-gate__title">Please come back once you have {missing.join(' and ')}</p>
          <p>
            Thanks for your interest! For our clients&apos; safety and convenience, every baker
            we work with is FSSAI registered and delivers to the venue. Once you have{' '}
            {missing.join(' and ')}, come back to this page and apply — we&apos;d love to hear
            from you.
          </p>
        </div>
      )}

      {passed && (
        <>
          {/* Q8 */}
          <div className="form__row">
            <label className="field">
              <span className="field__label">FSSAI registration number *</span>
              <input
                name="fssaiNumber"
                required
                inputMode="numeric"
                pattern="\d{14}"
                maxLength={14}
                placeholder="14 digits"
                title="Your 14-digit FSSAI number"
              />
            </label>
            <label className="field">
              <span className="field__label">Photo of your FSSAI certificate *</span>
              <input name="fssaiCertificate" type="file" required accept={UPLOAD_ACCEPT} />
              <span className="field__hint">Photo or PDF, up to 4 MB.</span>
            </label>
          </div>

          {/* Q9 */}
          <div className="form__row">
            <label className="field">
              <span className="field__label">How far do you deliver? (km) *</span>
              <input name="deliveryRadiusKm" type="number" min={1} required inputMode="numeric" placeholder="e.g. 15" />
            </label>
            <label className="field">
              <span className="field__label">Delivery charges (₹) *</span>
              <textarea
                name="deliveryRates"
                rows={2}
                required
                placeholder="e.g. ₹100 up to 5 km, ₹200 up to 10 km, ₹300 up to 15 km"
              />
              <span className="field__hint">Rupee amounts, please — not just “extra”.</span>
            </label>
          </div>

          {/* Q1 */}
          <fieldset className="field choice">
            <legend className="field__label">Your flavours and rate per kg *</legend>
            <span className="field__hint choice__hint">
              At least {MIN_FLAVOURS}. Add as many as you like.
            </span>
            {Array.from({ length: flavourRows }, (_, i) => (
              <div key={i} className="flavour-row">
                <input
                  name="flavourName"
                  required={i < MIN_FLAVOURS}
                  placeholder={['e.g. Black Forest', 'e.g. Butterscotch', 'e.g. Red Velvet'][i] ?? 'Flavour'}
                  aria-label={`Flavour ${i + 1}`}
                />
                <input
                  name="flavourRate"
                  type="number"
                  min={1}
                  required={i < MIN_FLAVOURS}
                  inputMode="numeric"
                  placeholder="₹ per kg"
                  aria-label={`Rate per kg for flavour ${i + 1}`}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn btn--ghost flavour-row__add"
              onClick={() => setFlavourRows((n) => n + 1)}
            >
              + Add flavour
            </button>
          </fieldset>
          <label className="field">
            <span className="field__label">Full menu card (optional)</span>
            <input name="menu" type="file" accept={UPLOAD_ACCEPT} />
            <span className="field__hint">A photo or PDF of your full menu with rates, up to 4 MB.</span>
          </label>

          {/* Q2, Q3 */}
          <Surcharge name="eggless" legend="Extra charge for eggless *" units={SURCHARGE_UNITS} />
          <Surcharge name="wheat" legend="Extra charge for wheat / atta *" units={SURCHARGE_UNITS} />

          {/* Q4 */}
          <TierCharge />

          {/* Q5 */}
          <Surcharge name="custom" legend="Charge for a custom theme cake *" units={CUSTOM_UNITS} />

          {/* Q6 */}
          <Radios name="minOrder" legend="Your minimum order" required options={MIN_ORDERS} />

          {/* Q7 */}
          <div className="form__row">
            <label className="field">
              <span className="field__label">Notice needed for a normal cake (days) *</span>
              <input name="leadNormalDays" type="number" min={0} required inputMode="numeric" placeholder="e.g. 1" />
            </label>
            <label className="field">
              <span className="field__label">Notice needed for a custom cake (days) *</span>
              <input name="leadCustomDays" type="number" min={0} required inputMode="numeric" placeholder="e.g. 3" />
            </label>
          </div>

          {/* Q10 */}
          <Radios
            name="venueServing"
            legend="Do you serve the cake at the venue?"
            hint="Knife, plates, tissues and candles — or do you only drop the cake off?"
            required
            stacked
            options={[
              ['yes', 'Yes, we serve at the venue'],
              ['no', 'No, drop-off only'],
            ]}
          />
        </>
      )}
    </fieldset>
  )
}

/** A charge with its unit; the ₹ box appears (and is required) only when it's charged. */
function Surcharge({
  name,
  legend,
  units,
}: {
  name: string
  legend: string
  units: readonly (readonly [string, string])[]
}) {
  const [unit, setUnit] = useState('')
  const charged = unit === 'per-kg' || unit === 'flat' || unit === 'per-cake'
  return (
    <fieldset className="field choice choice--grid">
      <legend className="field__label">{legend}</legend>
      {units.map(([v, l]) => (
        <label key={v} className="choice__option">
          <input type="radio" name={`${name}Unit`} value={v} required onChange={() => setUnit(v)} />
          <span>{l}</span>
        </label>
      ))}
      {charged && (
        <label className="field choice__hint">
          <span className="field__label">Amount (₹) *</span>
          <input name={`${name}Charge`} type="number" min={1} required inputMode="numeric" placeholder="e.g. 100" />
        </label>
      )}
    </fieldset>
  )
}

/** Q4: 2 kg and 3 kg tier charges, flat or per kg. */
function TierCharge() {
  const [unit, setUnit] = useState('')
  return (
    <fieldset className="field choice choice--grid">
      <legend className="field__label">Charge for a tier cake *</legend>
      {TIER_UNITS.map(([v, l]) => (
        <label key={v} className="choice__option">
          <input type="radio" name="tierUnit" value={v} required onChange={() => setUnit(v)} />
          <span>{l}</span>
        </label>
      ))}
      {unit && unit !== 'none' && (
        <div className="form__row choice__hint">
          <label className="field">
            <span className="field__label">2 kg tier (₹) *</span>
            <input name="tier2kgCharge" type="number" min={1} required inputMode="numeric" placeholder="e.g. 400" />
          </label>
          <label className="field">
            <span className="field__label">3 kg tier (₹) *</span>
            <input name="tier3kgCharge" type="number" min={1} required inputMode="numeric" placeholder="e.g. 600" />
          </label>
        </div>
      )}
    </fieldset>
  )
}

/**
 * Uploads the FSSAI certificate and optional menu to /api/vendor-uploads and
 * returns their ids. Throws a readable Error when a file is too big or the
 * upload fails.
 */
export async function uploadVendorFiles(fd: FormData) {
  const fileAt = (field: string) => {
    const file = fd.get(field)
    return file instanceof File && file.size > 0 ? file : undefined
  }
  // Check every file before uploading any, so a too-big menu doesn't leave an
  // orphaned certificate behind.
  for (const file of [fileAt('fssaiCertificate'), fileAt('menu')]) {
    if (file && file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`“${file.name}” is larger than 4 MB. Please upload a smaller photo or PDF.`)
    }
  }
  const upload = async (field: string, kind: string) => {
    const file = fileAt(field)
    if (!file) return undefined
    const body = new FormData()
    body.append('file', file)
    body.append('_payload', JSON.stringify({ kind }))
    const res = await fetch('/api/vendor-uploads', { method: 'POST', body })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.errors?.[0]?.message || `Couldn't upload “${file.name}”.`)
    return json.doc.id as number
  }
  return { fssaiCertificate: await upload('fssaiCertificate', 'fssai'), menu: await upload('menu', 'menu') }
}

/** The `cake` group for the application, from the form and the uploaded file ids. */
export function cakePayload(fd: FormData, files: { fssaiCertificate?: number; menu?: number }) {
  const names = fd.getAll('flavourName').map(String)
  const rates = fd.getAll('flavourRate')
  return {
    flavours: names
      .map((flavour, i) => ({ flavour: flavour.trim(), ratePerKg: num(rates[i]) }))
      .filter((f) => f.flavour),
    menu: files.menu,
    egglessUnit: str(fd.get('egglessUnit')),
    egglessCharge: num(fd.get('egglessCharge')),
    wheatUnit: str(fd.get('wheatUnit')),
    wheatCharge: num(fd.get('wheatCharge')),
    tierUnit: str(fd.get('tierUnit')),
    tier2kgCharge: num(fd.get('tier2kgCharge')),
    tier3kgCharge: num(fd.get('tier3kgCharge')),
    customUnit: str(fd.get('customUnit')),
    customCharge: num(fd.get('customCharge')),
    minOrder: str(fd.get('minOrder')),
    leadNormalDays: num(fd.get('leadNormalDays')),
    leadCustomDays: num(fd.get('leadCustomDays')),
    fssaiNumber: str(fd.get('fssaiNumber')),
    fssaiCertificate: files.fssaiCertificate,
    deliveryRadiusKm: num(fd.get('deliveryRadiusKm')),
    deliveryRates: str(fd.get('deliveryRates')),
    venueServing: str(fd.get('venueServing')),
  }
}
