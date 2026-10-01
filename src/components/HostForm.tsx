'use client'

import React, { useState } from 'react'

import { whatsappLink } from '../lib/site'
import {
  HOST_CITIES,
  HOST_DAYS,
  HOST_EVENT_TYPES,
  HOST_EXPERIENCES,
  HOST_LANGUAGES,
  HOST_RELATIONS,
  HOST_SEATS,
  YES_NO,
} from '../lib/hostOptions'
import { Checkboxes, Radios, num, str } from './FormChoices'

type Props = { whatsapp?: string }

function Select({
  name,
  label,
  options,
  required,
  defaultValue = '',
  hint,
}: {
  name: string
  label: string
  options: readonly (readonly [string, string])[]
  required?: boolean
  defaultValue?: string
  hint?: string
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required && ' *'}
      </span>
      <select name={name} required={required} defaultValue={defaultValue}>
        {!defaultValue && (
          <option value="" disabled={required}>
            Choose one
          </option>
        )}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

/**
 * "Earn from events" host application (/earn). A family tells us about their
 * wedding or function; the team verifies them and arranges foreign guests.
 */
export function HostForm({ whatsapp }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'invalid'>('idle')
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
    if (!form.checkValidity()) {
      setStatus('invalid')
      form.reportValidity()
      return
    }

    const payload = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      email: str(fd.get('email')),
      relation: str(fd.get('relation')),
      eventType: fd.get('eventType'),
      eventDate: fd.get('eventDate'),
      days: fd.get('days'),
      city: fd.get('city'),
      venueArea: str(fd.get('venueArea')),
      language: str(fd.get('language')),
      guestCount: num(fd.get('guestCount')),
      touristSeats: fd.get('touristSeats'),
      experiences: fd.getAll('experiences'),
      englishSpeaker: str(fd.get('englishSpeaker')),
      rituals: str(fd.get('rituals')),
      message: str(fd.get('message')),
      consent: fd.get('consent') === 'on',
      source: 'earn-page',
    }

    setStatus('sending')
    setName((payload.name as string) || '')
    try {
      const res = await fetch('/api/host-applications', {
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
      `Hi Zenfest Events, I just applied to host guests at our event${name ? ` (${name})` : ''}.`,
    )
    return (
      <div className="form-success" role="status">
        <h3 className="display-m">Thank you{name ? `, ${name.split(' ')[0]}` : ''}!</h3>
        <p className="muted">
          We&apos;ve received your event. Our team will call you to get to know your family
          before we introduce any guests. For a faster reply, message us on WhatsApp.
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
      <fieldset className="form__section">
        <legend className="form__section-title">About you</legend>
        <div className="form__row">
          <label className="field">
            <span className="field__label">Your name *</span>
            <input name="name" required autoComplete="name" placeholder="e.g. Lakshmi" />
          </label>
          <label className="field">
            <span className="field__label">Phone / WhatsApp *</span>
            <input name="phone" required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" />
          </label>
        </div>
        <div className="form__row">
          <label className="field">
            <span className="field__label">Email</span>
            <input name="email" type="email" autoComplete="email" placeholder="Optional" />
          </label>
          <Select name="relation" label="You are the…" options={HOST_RELATIONS} />
        </div>
      </fieldset>

      <fieldset className="form__section">
        <legend className="form__section-title">Your event</legend>
        <div className="form__row">
          <Select name="eventType" label="Event" options={HOST_EVENT_TYPES} required />
          <label className="field">
            <span className="field__label">Date (first day) *</span>
            <input name="eventDate" type="date" required />
          </label>
        </div>
        <div className="form__row">
          <Select name="days" label="How many days?" options={HOST_DAYS} required />
          <Select
            name="city"
            label="City"
            options={HOST_CITIES}
            required
            defaultValue="chennai"
            hint="We currently host events in Tamil Nadu — more cities coming."
          />
        </div>
        <div className="form__row">
          <label className="field">
            <span className="field__label">Venue / area</span>
            <input name="venueArea" placeholder="e.g. Mylapore, marriage hall" />
          </label>
          <Select name="language" label="Family language" options={HOST_LANGUAGES} defaultValue="tamil" />
        </div>
        <label className="field">
          <span className="field__label">Ceremonies guests would see</span>
          <textarea
            name="rituals"
            rows={3}
            placeholder="e.g. Nalangu, mehendi night, muhurtham, reception…"
          />
        </label>
      </fieldset>

      <fieldset className="form__section">
        <legend className="form__section-title">Your guests</legend>
        <div className="form__row">
          <label className="field">
            <span className="field__label">Expected total attendance</span>
            <input name="guestCount" type="number" min={0} inputMode="numeric" placeholder="e.g. 400" />
          </label>
          <Select name="touristSeats" label="Foreign guests you'd welcome" options={HOST_SEATS} required />
        </div>
        <Checkboxes name="experiences" legend="You can also offer (optional)" options={HOST_EXPERIENCES} />
        <Radios
          name="englishSpeaker"
          legend="Is there a family member who speaks English and can look after guests?"
          options={YES_NO}
        />
        <label className="field">
          <span className="field__label">Anything else</span>
          <textarea name="message" rows={3} placeholder="Questions, special customs, what guests should know…" />
        </label>
      </fieldset>

      <label className="field choice__option earn-consent">
        <input type="checkbox" name="consent" required />
        <span>
          Our family agrees to welcome foreign guests at this event and to be contacted by
          Zenfest Events. *
        </span>
      </label>

      {/* Honeypot */}
      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {status === 'invalid' && (
        <p className="form__error" role="alert">
          Please fill in the fields marked * and tick the agreement.
        </p>
      )}
      {status === 'error' && (
        <p className="form__error" role="alert">
          Something went wrong. Please try again, or WhatsApp us directly.
        </p>
      )}

      <button className="btn btn--primary form__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Apply to host'}
      </button>
    </form>
  )
}
