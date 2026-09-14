'use client'

import React, { useState } from 'react'

import { whatsappLink } from '../lib/site'

type Props = { whatsapp?: string }

const EVENT_TYPES = [
  ['wedding', 'Wedding'],
  ['birthday', 'Birthday'],
  ['corporate', 'Corporate function'],
  ['housewarming', 'Housewarming'],
  ['sports', 'Sports event'],
  ['other', 'Other'],
]

export function InquiryForm({ whatsapp }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [name, setName] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    // Honeypot: real users never fill this.
    if ((fd.get('company') as string)?.trim()) {
      setStatus('done')
      return
    }

    const payload = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      email: fd.get('email') || undefined,
      eventType: fd.get('eventType') || undefined,
      eventDate: fd.get('eventDate') || undefined,
      branch: fd.get('branch') || undefined,
      message: fd.get('message') || undefined,
      source: 'website',
    }

    setStatus('sending')
    setName((payload.name as string) || '')
    try {
      const res = await fetch('/api/leads', {
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
    const wa = whatsappLink(
      whatsapp,
      `Hi Zenfest Events, I just submitted an enquiry${name ? ` (${name})` : ''}. Looking forward to hearing from you.`,
    )
    return (
      <div className="form-success" role="status">
        <h3 className="display-m">Thank you{name ? `, ${name.split(' ')[0]}` : ''}!</h3>
        <p className="muted">
          We&apos;ve received your enquiry and will call you back shortly. For a faster
          reply, message us on WhatsApp.
        </p>
        {whatsapp && (
          <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
            Continue on WhatsApp
          </a>
        )}
      </div>
    )
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Your name *</span>
          <input name="name" required autoComplete="name" placeholder="e.g. Priya" />
        </label>
        <label className="field">
          <span className="field__label">Phone *</span>
          <input
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile"
          />
        </label>
      </div>

      <div className="form__row">
        <label className="field">
          <span className="field__label">Event type</span>
          <select name="eventType" defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {EVENT_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Event date</span>
          <input name="eventDate" type="date" />
        </label>
      </div>

      <div className="form__row">
        <label className="field">
          <span className="field__label">Nearest branch</span>
          <select name="branch" defaultValue="">
            <option value="">No preference</option>
            <option value="guduvancheri">Guduvancheri</option>
            <option value="thiruverkadu">Thiruverkadu</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Email</span>
          <input name="email" type="email" autoComplete="email" placeholder="Optional" />
        </label>
      </div>

      <label className="field">
        <span className="field__label">Tell us about your event</span>
        <textarea name="message" rows={4} placeholder="Guest count, venue, what you have in mind…" />
      </label>

      {/* Honeypot */}
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
          Something went wrong. Please try again, or call/WhatsApp us directly.
        </p>
      )}

      <button className="btn btn--primary form__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Request a callback'}
      </button>
    </form>
  )
}
