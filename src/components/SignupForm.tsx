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

type Basics = {
  name: string
  phone: string
  birthday: string
  planningEvent: 'yes' | 'no'
}

/**
 * Sign-up for the ₹100-off offer.
 *
 * Two steps: everyone gives their details, and answering "yes" to "planning an
 * event?" branches into the event questions rather than showing them to people
 * who don't need them. Answering "no" submits straight away.
 */
export function SignupForm({ whatsapp }: Props) {
  const [step, setStep] = useState<'basics' | 'event'>('basics')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [basics, setBasics] = useState<Basics | null>(null)
  const [firstName, setFirstName] = useState('')

  async function send(payload: Record<string, unknown>) {
    setStatus('sending')
    try {
      const res = await fetch('/api/signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source: 'signup-page', offer: 'SIGNUP100' }),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  function onBasicsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    // Honeypot: real users never fill this.
    if ((fd.get('company') as string)?.trim()) {
      setStatus('done')
      return
    }

    const next: Basics = {
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      birthday: String(fd.get('birthday') || ''),
      planningEvent: (fd.get('planningEvent') as 'yes' | 'no') || 'no',
    }
    setBasics(next)
    setFirstName(next.name.split(' ')[0] || '')

    if (next.planningEvent === 'yes') {
      setStep('event')
      return
    }
    void send(next)
  }

  function onEventSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!basics) return
    const fd = new FormData(e.currentTarget)
    void send({
      ...basics,
      eventType: fd.get('eventType') || undefined,
      eventDate: fd.get('eventDate') || undefined,
      guestCount: fd.get('guestCount') ? Number(fd.get('guestCount')) : undefined,
      message: fd.get('message') || undefined,
    })
  }

  if (status === 'done') {
    const wa = whatsappLink(
      whatsapp,
      `Hi Zenfest Events, I just signed up${firstName ? ` (${firstName})` : ''} for the ₹100 offer.`,
    )
    return (
      <div className="form-success" role="status">
        <h3 className="display-m">You&apos;re in{firstName ? `, ${firstName}` : ''}!</h3>
        <p className="muted">
          Your ₹100 discount is saved against your phone number — mention it when we
          quote and we&apos;ll take it off your total bill.
          {basics?.planningEvent === 'yes' &&
            ' We have your event details too, and will call you back shortly.'}
        </p>
        {whatsapp && (
          <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
            Continue on WhatsApp
          </a>
        )}
      </div>
    )
  }

  if (step === 'event') {
    return (
      <form className="form" onSubmit={onEventSubmit} noValidate>
        <p className="signup-step" aria-live="polite">
          Step 2 of 2 — about your event
        </p>

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

        <label className="field">
          <span className="field__label">Roughly how many guests?</span>
          <input name="guestCount" type="number" min={1} inputMode="numeric" placeholder="e.g. 250" />
        </label>

        <label className="field">
          <span className="field__label">Anything you already have in mind?</span>
          <textarea name="message" rows={4} placeholder="Venue, theme, budget…" />
        </label>

        {status === 'error' && (
          <p className="form__error" role="alert">
            Something went wrong. Please try again, or call/WhatsApp us directly.
          </p>
        )}

        <div className="btn-row">
          <button
            className="btn btn--primary form__submit"
            type="submit"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Finish sign-up'}
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setStep('basics')}>
            Back
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="form" onSubmit={onBasicsSubmit} noValidate>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Full name *</span>
          <input name="name" required autoComplete="name" placeholder="e.g. Priya Raman" />
        </label>
        <label className="field">
          <span className="field__label">Phone number *</span>
          <input
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile"
          />
        </label>
      </div>

      <label className="field">
        <span className="field__label">Birthday *</span>
        <input name="birthday" type="date" required />
        <span className="field__hint">So we can wish you — and send a birthday offer.</span>
      </label>

      <fieldset className="field choice">
        <legend className="field__label">Planning an event?</legend>
        <label className="choice__option">
          <input type="radio" name="planningEvent" value="yes" />
          <span>Yes — I&apos;m planning one</span>
        </label>
        <label className="choice__option">
          <input type="radio" name="planningEvent" value="no" defaultChecked />
          <span>Not right now — just sign me up</span>
        </label>
      </fieldset>

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

      <button
        className="btn btn--primary form__submit"
        type="submit"
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Sending…' : 'Sign up & claim ₹100 off'}
      </button>
    </form>
  )
}
