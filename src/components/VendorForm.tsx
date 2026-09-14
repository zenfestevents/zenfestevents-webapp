'use client'

import React, { useState } from 'react'

const VENDOR_TYPES = [
  ['decoration', 'Decoration'],
  ['catering', 'Catering'],
  ['photography', 'Photography'],
  ['dj', 'DJ / Music'],
  ['other', 'Other'],
]

export function VendorForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    if ((fd.get('company') as string)?.trim()) {
      setStatus('done')
      return
    }

    const payload = {
      name: fd.get('name'),
      businessName: fd.get('businessName') || undefined,
      vendorType: fd.get('vendorType'),
      phone: fd.get('phone'),
      email: fd.get('email') || undefined,
      city: fd.get('city') || undefined,
      portfolioUrl: fd.get('portfolioUrl') || undefined,
      message: fd.get('message') || undefined,
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus('done')
      form.reset()
    } catch {
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
          <input name="name" required autoComplete="name" />
        </label>
        <label className="field">
          <span className="field__label">Business name</span>
          <input name="businessName" autoComplete="organization" />
        </label>
      </div>

      <div className="form__row">
        <label className="field">
          <span className="field__label">What you offer *</span>
          <select name="vendorType" required defaultValue="">
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
        <label className="field">
          <span className="field__label">Phone *</span>
          <input name="phone" required inputMode="tel" autoComplete="tel" />
        </label>
      </div>

      <div className="form__row">
        <label className="field">
          <span className="field__label">City / area</span>
          <input name="city" />
        </label>
        <label className="field">
          <span className="field__label">Email</span>
          <input name="email" type="email" autoComplete="email" placeholder="Optional" />
        </label>
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
          Something went wrong. Please try again.
        </p>
      )}

      <button className="btn btn--primary form__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Submit application'}
      </button>
    </form>
  )
}
