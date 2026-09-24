'use client'

import React, { useState } from 'react'

import {
  PHOTO_EDITING,
  PHOTO_SERVICES,
  editingFor,
  PHOTO_SERVICES_SUMMARY,
  photoServiceLabel,
  type PhotoService,
} from '../lib/vendorOptions'
import { CakeFields, cakePayload, uploadVendorFiles } from './CakeFields'
import { Checkboxes, Radios, num, str } from './FormChoices'
import { PhoneVerify, type PhoneProof, type VerifyMode } from './PhoneVerify'

// Decoration / Catering / DJ still exist in the collection for older
// applications; the form only offers the services we're enrolling right now.
const VENDOR_TYPES = [
  ['photography', 'Photography'],
  ['cake', 'Cakes'],
  ['other', 'Other'],
]

// Major Chennai areas, alphabetical. The chosen area (or the typed one, for
// "Other") is saved in the collection's `city` field.
const CHENNAI_AREAS = [
  'Adyar', 'Alwarpet', 'Ambattur', 'Anna Nagar', 'Ashok Nagar', 'Avadi',
  'Besant Nagar', 'Chengalpattu', 'Chromepet', 'ECR', 'Egmore', 'Guduvanchery',
  'Guindy', 'Kelambakkam', 'Kilpauk', 'KK Nagar', 'Kodambakkam', 'Kolathur',
  'Madhavaram', 'Madipakkam', 'Medavakkam', 'Mogappair', 'Mylapore',
  'Nungambakkam', 'OMR', 'Pallavaram', 'Perambur', 'Perungudi', 'Poonamallee',
  'Porur', 'Purasaiwakkam', 'Red Hills', 'Royapettah', 'Saidapet',
  'Sholinganallur', 'Sriperumbudur', 'T. Nagar', 'Tambaram', 'Thiruvanmiyur',
  'Thiruvottiyur', 'Tiruvallur', 'Tondiarpet', 'Triplicane', 'Vadapalani',
  'Valasaravakkam', 'Velachery', 'Vepery', 'Virugambakkam', 'Washermanpet',
  'West Mambalam',
]

export function VendorForm({ verifyMode }: { verifyMode: VerifyMode }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [phoneProof, setPhoneProof] = useState<PhoneProof>(null)
  const [vendorType, setVendorType] = useState('')
  const [name, setName] = useState('')
  const [sameAsName, setSameAsName] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [area, setArea] = useState('')
  const [coverage, setCoverage] = useState('')
  const [specialty, setSpecialty] = useState<PhotoService | ''>('')
  // True when a baker has no FSSAI registration or doesn't deliver — the form
  // then asks them to come back later instead of letting them submit.
  const [cakeBlocked, setCakeBlocked] = useState(false)

  // Services that need a price & camera row: all four, or the specialist's one.
  const coveredServices: PhotoService[] =
    coverage === 'all'
      ? PHOTO_SERVICES.map(([v]) => v)
      : coverage === 'single' && specialty
        ? [specialty]
        : []

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    if ((fd.get('company') as string)?.trim()) {
      setStatus('done')
      return
    }
    // The form is noValidate for styling; still stop on missing required fields
    // (notably "Which service?", which the collection can't require on its own).
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    if (verifyMode !== 'off' && !phoneProof) {
      setErrorMsg('Verify your phone number on WhatsApp first.')
      setStatus('error')
      document.getElementById('phone-verify-input')?.focus()
      return
    }

    const type = fd.get('vendorType')
    if (type === 'cake' && cakeBlocked) return

    setStatus('sending')
    setErrorMsg('')
    try {
      // Cake files (FSSAI certificate, menu) upload first; the application
      // then points at them.
      const cake = type === 'cake' ? cakePayload(fd, await uploadVendorFiles(fd)) : undefined
      const payload = {
        name: fd.get('name'),
        businessName: str(fd.get('businessName')),
        vendorType: type,
        otherService: type === 'other' ? str(fd.get('otherService')) : undefined,
        photography:
          type === 'photography'
            ? {
                coverage,
                specialty: coverage === 'single' ? specialty : undefined,
                rates: coveredServices.map((service) => ({
                  service,
                  sessionPrice: num(fd.get(`price_${service}`)),
                  camera: str(fd.get(`camera_${service}`)),
                })),
                // "All" ticks editing options directly; a specialist answers yes/no,
                // which maps to the one option that fits their service (none for drone).
                editing:
                  coverage === 'all'
                    ? fd.getAll('editing')
                    : specialty && fd.get('editsOwn') === 'yes' && editingFor(specialty)
                      ? [editingFor(specialty)]
                      : [],
              }
            : undefined,
        cake,
        phone: fd.get('phone'),
        phoneVerification: phoneProof ?? undefined,
        city: str(fd.get(fd.get('area') === 'other' ? 'otherArea' : 'area')),
        portfolioUrl: str(fd.get('portfolioUrl')),
        message: str(fd.get('message')),
      }

      const res = await fetch('/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        // Payload returns { errors: [{ message }] }; show ours (e.g. verification) as-is.
        const body = await res.json().catch(() => null)
        throw new Error(body?.errors?.[0]?.message || '')
      }
      setStatus('done')
      form.reset()
      setVendorType('')
      setName('')
      setSameAsName(false)
      setBusinessName('')
      setArea('')
      setCoverage('')
      setSpecialty('')
      setPhoneProof(null)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="form-success" role="status">
        <h3 className="display-m">Application received</h3>
        <p className="muted">
          Thanks for your interest in partnering with Zenfest Events. Our team will review
          your details and get in touch if there&apos;s a fit.
        </p>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Your name *</span>
          <input
            name="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="field">
          <label className="field__label" htmlFor="vendor-business">
            Business name *
          </label>
          <input
            id="vendor-business"
            name="businessName"
            required
            autoComplete="organization"
            readOnly={sameAsName}
            value={sameAsName ? name : businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
          <label className="choice__option field__hint">
            <input
              type="checkbox"
              checked={sameAsName}
              onChange={(e) => setSameAsName(e.target.checked)}
            />
            <span>Same as my name</span>
          </label>
        </div>
      </div>

      <PhoneVerify mode={verifyMode} purpose="vendor" onVerified={setPhoneProof} />

      <div className="form__row">
        <label className="field">
          <span className="field__label">What you offer *</span>
          <select
            name="vendorType"
            required
            value={vendorType}
            onChange={(e) => setVendorType(e.target.value)}
          >
            <option value="" disabled>
              Choose one
            </option>
            {VENDOR_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {vendorType === 'other' && (
        <label className="field">
          <span className="field__label">Which service do you offer? *</span>
          <input name="otherService" required placeholder="e.g. Decoration, Mehendi, DJ" />
        </label>
      )}

      {vendorType === 'photography' && (
        <fieldset className="form__section">
          <legend className="form__section-title">Photography details</legend>
          <Radios
            name="coverage"
            legend="How do you work?"
            hint={`We book ${PHOTO_SERVICES.length} services: ${PHOTO_SERVICES_SUMMARY}.`}
            stacked
            required
            onChange={setCoverage}
            options={[
              ['single', 'I do one of these services'],
              ['all', `I take care of all ${PHOTO_SERVICES.length} (${PHOTO_SERVICES_SUMMARY})`],
            ]}
          />
          {coverage === 'single' && (
            <Radios
              name="specialty"
              legend="Which one?"
              required
              onChange={(v) => setSpecialty(v as PhotoService)}
              options={PHOTO_SERVICES}
            />
          )}

          {coveredServices.map((service) => (
            <fieldset key={service} className="field choice">
              <legend className="field__label">{photoServiceLabel(service)}</legend>
              <div className="form__row">
                <label className="field">
                  <span className="field__label">Price for 1 session (₹) *</span>
                  <input
                    name={`price_${service}`}
                    type="number"
                    min={0}
                    required
                    inputMode="numeric"
                    placeholder="e.g. 15000"
                  />
                  <span className="field__hint">1 session ≈ 5 hours.</span>
                </label>
                <label className="field">
                  <span className="field__label">
                    {service === 'drone' ? 'Drone model *' : 'Camera model *'}
                  </span>
                  <input
                    name={`camera_${service}`}
                    required
                    placeholder={
                      service === 'drone'
                        ? 'e.g. DJI Mini 4 Pro'
                        : service.endsWith('video')
                          ? 'e.g. Sony FX3'
                          : 'e.g. Canon R6'
                    }
                  />
                </label>
              </div>
            </fieldset>
          ))}

          {coverage === 'all' && (
            <Checkboxes name="editing" legend="Album & editing you'll do" options={PHOTO_EDITING} />
          )}
          {coverage === 'single' && specialty && specialty !== 'drone' && (
            <Radios
              key={specialty}
              name="editsOwn"
              legend={
                specialty.endsWith('photo')
                  ? 'Will you design the album?'
                  : 'Will you edit the video?'
              }
              required
              options={[
                ['yes', 'Yes'],
                ['no', 'No'],
              ]}
            />
          )}
        </fieldset>
      )}

      {vendorType === 'cake' && <CakeFields onBlockedChange={setCakeBlocked} />}

      <div className="form__row">
        <label className="field">
          <span className="field__label">Area</span>
          <select name="area" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Choose your area</option>
            <option value="All over Chennai">All over Chennai</option>
            {CHENNAI_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="other">Other</option>
          </select>
        </label>
        {area === 'other' && (
          <label className="field">
            <span className="field__label">Which area? *</span>
            <input name="otherArea" required placeholder="e.g. Kanchipuram" />
          </label>
        )}
      </div>

      <label className="field">
        <span className="field__label">Portfolio / Instagram / website</span>
        <input name="portfolioUrl" placeholder="Link to your work" />
      </label>

      <label className="field">
        <span className="field__label">Anything else</span>
        <textarea name="message" rows={3} placeholder="Experience, typical scale of events…" />
      </label>

      <input
        className="hp"
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {status === 'error' && (
        <p className="form__error" role="alert">
          {errorMsg || 'Something went wrong. Please try again.'}
        </p>
      )}

      {!(vendorType === 'cake' && cakeBlocked) && (
        <button className="btn btn--primary form__submit" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Submit application'}
        </button>
      )}
    </form>
  )
}
