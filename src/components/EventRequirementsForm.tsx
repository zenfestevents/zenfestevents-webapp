'use client'

import Link from 'next/link'
import React, { useRef, useState } from 'react'

import {
  BIRTHDAY_CHILD,
  ENQUIRY_EVENTS,
  EXTRA_SHOOTS,
  SERVICES_BY_EVENT,
  TWINS_TYPES,
  WEDDING_PARTS,
  hasReception,
  hasWedding,
  tenDigitMobile,
  type EnquiryEvent,
} from '../lib/eventRequirements'
import { whatsappLink } from '../lib/site'
import { Checkboxes, Radios } from './FormChoices'
import { BallDots } from './game'

const STEPS = ['Event', 'When & where', 'Services', 'Details', 'Your details'] as const

/** The logged-in couple or vendor, whose name and number the form doesn't ask for again. */
export type EnquiryAccount = { name: string; phone: string; couple: boolean }

/** Today in India, as YYYY-MM-DD (the date input's `min`). */
const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)

/** "••••••1234": enough to recognise your own number on a shared screen. */
const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? `••••••${digits.slice(-4)}` : ''
}

/**
 * "Plan your event" (/enquire): the team's Tally forms rebuilt as one stepped form.
 * The first answer (wedding / birthday / baby shower) decides the rest. Every step
 * stays mounted (hidden) so the final FormData has all answers; each step is checked
 * before moving on. Saves a Lead (`requirements` group) like the other site forms.
 * Logged in, the last step only confirms who is sending (the server stamps a couple's
 * own name and number on the lead, see stampLeadAccounts).
 */
export function EventRequirementsForm({
  whatsapp,
  initialEvent,
  account: signedIn,
}: {
  whatsapp?: string
  initialEvent?: EnquiryEvent
  account?: EnquiryAccount
}) {
  const formRef = useRef<HTMLFormElement>(null)
  // Cleared by "Not you?", which logs out and shows the contact fields instead.
  const [account, setAccount] = useState(signedIn ?? null)
  const [leaving, setLeaving] = useState(false)
  const [step, setStep] = useState(initialEvent ? 1 : 0)
  const [event, setEvent] = useState<EnquiryEvent | ''>(initialEvent ?? '')
  const [part, setPart] = useState('')
  const [twins, setTwins] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [name, setName] = useState('')

  const services = event ? SERVICES_BY_EVENT[event] : []
  const last = STEPS.length - 1

  /** The first problem on step `i`, or '' when it's complete. */
  function problem(i: number): string {
    const form = formRef.current
    if (!form) return ''
    const fd = new FormData(form)
    const get = (k: string) => String(fd.get(k) ?? '').trim()
    switch (i) {
      case 0:
        return event ? '' : 'Choose what you are celebrating.'
      case 1:
        if (!get('eventDate')) return 'Choose the event date.'
        if (get('eventDate') < todayIST()) return 'The event date has already passed.'
        if (!get('startTime')) return 'Choose a start time.'
        if (!get('location')) return 'Tell us where the event is.'
        if (event === 'wedding' && !part) return 'Choose which functions you are planning.'
        return ''
      case 2:
        if (event === 'wedding') {
          if (hasReception(part) && fd.getAll('receptionServices').length === 0)
            return 'Choose at least one service for the reception.'
          if (hasWedding(part) && fd.getAll('weddingServices').length === 0)
            return 'Choose at least one service for the wedding.'
          return ''
        }
        return fd.getAll('services').length ? '' : 'Choose at least one service.'
      case 3: {
        if (event === 'wedding' && fd.getAll('extraShoots').length === 0)
          return 'Tell us if you need a pre- or post-wedding shoot.'
        if (event === 'birthday') {
          if (!twins) return 'Tell us if the birthday is for twins.'
          if (twins === 'no' && !get('birthdayChild')) return 'Choose boy or girl.'
          if (twins === 'yes' && !get('twinsType')) return 'Choose the twins type.'
        }
        const guests = Number(get('guestCount'))
        if (!Number.isInteger(guests) || guests < 1) return 'Enter the number of guests.'
        if (!get('budget')) return 'Enter an approximate budget.'
        return ''
      }
      default:
        if (account) return ''
        if (!get('name')) return 'Enter your name.'
        if (!tenDigitMobile(get('phone'))) return 'Enter a 10-digit WhatsApp / mobile number.'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('email'))) return 'Enter a valid email address.'
        return ''
    }
  }

  function goTo(i: number) {
    setError('')
    setStep(i)
    // Vertical only: scrollIntoView also scrolls the page section sideways (it clips
    // the kolam watermark), shifting the whole form off-screen.
    const form = formRef.current
    if (form) {
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72
      const top = form.getBoundingClientRect().top + window.scrollY - header - 16
      if (top < window.scrollY) window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  /** "Not you?": log this account out (Payload's own endpoint) and ask for contact details instead.
   *  The answers so far stay, because every step stays mounted. */
  async function notYou() {
    if (!account) return
    setLeaving(true)
    await fetch(`/api/${account.couple ? 'customers' : 'vendors'}/logout`, { method: 'POST', credentials: 'include' }).catch(
      () => null,
    )
    setLeaving(false)
    setAccount(null)
    setError('')
  }

  function next() {
    const p = problem(step)
    if (p) return setError(p)
    goTo(step + 1)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (step < last) return next()
    const form = e.currentTarget
    const fd = new FormData(form)
    if (String(fd.get('company') ?? '').trim()) return setStatus('done') // honeypot
    for (let i = 0; i <= last; i++) {
      const p = problem(i)
      if (p) {
        setStep(i)
        return setError(p)
      }
    }
    const get = (k: string) => String(fd.get(k) ?? '').trim()
    const list = (k: string) => fd.getAll(k).map(String)
    const birthdayFor =
      event === 'birthday' ? (twins === 'yes' ? `Twins: ${get('twinsType')}` : get('birthdayChild')) : undefined

    const payload = {
      name: account?.name ?? get('name'),
      phone: tenDigitMobile(account?.phone ?? get('phone')) || account?.phone,
      // Accounts sign in with WhatsApp only and have no real email to send.
      email: account ? undefined : get('email'),
      eventType: event,
      // Noon IST, so the calendar day survives every timezone (see lib/occasions/dates.ts).
      eventDate: new Date(`${get('eventDate')}T12:00:00+05:30`).toISOString(),
      message: get('message') || undefined,
      source: 'event-requirements',
      requirements: {
        weddingParts: event === 'wedding' ? part : undefined,
        startTime: get('startTime'),
        location: get('location'),
        services: event === 'wedding' ? undefined : list('services'),
        receptionServices: event === 'wedding' && hasReception(part) ? list('receptionServices') : undefined,
        weddingServices: event === 'wedding' && hasWedding(part) ? list('weddingServices') : undefined,
        extraShoots: event === 'wedding' ? list('extraShoots') : undefined,
        birthdayFor,
        birthdaySurprise: event === 'birthday' ? fd.get('birthdaySurprise') === 'yes' : undefined,
        guestCount: Number(get('guestCount')),
        budget: get('budget'),
      },
    }

    setStatus('sending')
    setError('')
    setName(payload.name)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    const label = ENQUIRY_EVENTS.find(([v]) => v === event)?.[1].toLowerCase() ?? 'event'
    const wa = whatsappLink(
      whatsapp,
      `Hi Zenfest Events, I just shared my ${label} details on your website${name ? ` (${name})` : ''}.`,
    )
    return (
      <div className="form-success evq-done" role="status">
        {/* The sixth ball: five steps bowled, this one takes the wicket. */}
        <BallDots done={6} />
        <p className="howzat evq-done__howzat">Howzat!</p>
        <h3 className="display-m">Thank you{name ? `, ${name.split(' ')[0]}` : ''}!</h3>
        <p className="muted">
          We&apos;ve got your {label} details. Our team will call you back with ideas and a quote. For a faster reply,
          message us on WhatsApp.
        </p>
        {account?.couple && (
          <p className="muted">
            Runs for planning with us go on your <Link href="/account">Scorecard</Link>.
          </p>
        )}
        {whatsapp && (
          <a className="btn btn--whatsapp" href={wa} target="_blank" rel="noopener">
            Continue on WhatsApp
          </a>
        )}
      </div>
    )
  }

  return (
    <form ref={formRef} className="form evq" onSubmit={onSubmit} noValidate>
      {/* Each step is a ball of the over; sending is the sixth. */}
      <p className="evq__over mono" aria-hidden="true">
        Over 0.{step + 1}
        <span>
          {STEPS.length - step} {STEPS.length - step === 1 ? 'ball' : 'balls'} to go
        </span>
      </p>
      <ol className="evq__steps" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
            <span className="evq__dot">{i + 1}</span>
            <span className="evq__label">{i === last && account ? 'Confirm' : label}</span>
          </li>
        ))}
      </ol>

      {/* 1 — what are you celebrating? */}
      <div hidden={step !== 0} className="evq__step">
        <fieldset className="field">
          <legend className="field__label">What are you celebrating? *</legend>
          <div className="evq__events">
            {ENQUIRY_EVENTS.map(([v, l]) => (
              <label key={v} className={`evq__event ${event === v ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="eventType"
                  value={v}
                  checked={event === v}
                  onChange={() => {
                    setEvent(v)
                    setError('')
                  }}
                />
                <span className="evq__event-icon" aria-hidden="true">
                  {v === 'wedding' ? '💍' : v === 'birthday' ? '🎂' : '🍼'}
                </span>
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* 2 — when & where */}
      <div hidden={step !== 1} className="evq__step">
        <div className="form__row">
          <label className="field">
            <span className="field__label">Event date *</span>
            <input name="eventDate" type="date" min={todayIST()} required />
          </label>
          <label className="field">
            <span className="field__label">Start time *</span>
            <input name="startTime" type="time" required />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Event location *</span>
          <input name="location" required maxLength={200} placeholder="Town / venue, e.g. Tambaram, Madurai or a hall name" />
        </label>
        {event === 'wedding' && (
          <Radios
            name="weddingParts"
            legend="Which event are you planning?"
            options={WEDDING_PARTS}
            required
            stacked
            onChange={(v) => {
              setPart(v)
              setError('')
            }}
          />
        )}
      </div>

      {/* 3 — services */}
      <div hidden={step !== 2} className="evq__step">
        {event === 'wedding' ? (
          <>
            {hasReception(part) && (
              <Checkboxes name="receptionServices" legend="Services for the reception *" options={services} />
            )}
            {hasWedding(part) && (
              <Checkboxes name="weddingServices" legend="Services for the wedding *" options={services} />
            )}
          </>
        ) : (
          event && (
            <Checkboxes
              name="services"
              legend={`Services for the ${event === 'birthday' ? 'birthday' : 'baby shower'} *`}
              options={services}
            />
          )
        )}
      </div>

      {/* 4 — event-specific details, guests, budget */}
      <div hidden={step !== 3} className="evq__step">
        {event === 'wedding' && <Checkboxes name="extraShoots" legend="Do you need an extra shoot? *" options={EXTRA_SHOOTS} />}
        {event === 'birthday' && (
          <>
            <label className="choice__option evq__tick">
              <input type="checkbox" name="birthdaySurprise" value="yes" />
              <span>We&apos;d like a birthday surprise</span>
            </label>
            <Radios
              name="twins"
              legend="Is the birthday celebration for twins?"
              options={[
                ['no', 'No'],
                ['yes', 'Yes'],
              ]}
              required
              onChange={(v) => {
                setTwins(v)
                setError('')
              }}
            />
            {twins === 'no' && (
              <Radios name="birthdayChild" legend="Is the birthday for a boy or a girl?" options={BIRTHDAY_CHILD} required />
            )}
            {twins === 'yes' && <Radios name="twinsType" legend="Twins type" options={TWINS_TYPES} required />}
          </>
        )}
        <div className="form__row">
          <label className="field">
            <span className="field__label">Guest count *</span>
            <input name="guestCount" type="number" inputMode="numeric" min={1} max={100000} required placeholder="e.g. 300" />
          </label>
          <label className="field">
            <span className="field__label">Approximate budget *</span>
            <input name="budget" required maxLength={60} placeholder="e.g. ₹3 lakh" />
          </label>
        </div>
      </div>

      {/* 5 — contact (logged in: just who is sending) */}
      <div hidden={step !== 4} className="evq__step">
        {account ? (
          <div className="evq__account">
            <p className="evq__account-label">Sending as</p>
            <p className="evq__account-name">
              {account.name}
              {maskPhone(account.phone) && <span className="mono"> · WhatsApp {maskPhone(account.phone)}</span>}
            </p>
            <p className="muted">We&apos;ll call or WhatsApp you on this number.</p>
            <button type="button" className="evq__account-switch" onClick={notYou} disabled={leaving}>
              {leaving ? 'Logging out…' : 'Not you? Log out'}
            </button>
          </div>
        ) : (
          <>
            <div className="form__row">
              <label className="field">
                <span className="field__label">Your name *</span>
                <input name="name" required autoComplete="name" maxLength={100} placeholder="e.g. Priya" />
              </label>
              <label className="field">
                <span className="field__label">WhatsApp / contact number *</span>
                <input name="phone" required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Email *</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
          </>
        )}
        <label className="field">
          <span className="field__label">Anything else?</span>
          <textarea name="message" rows={3} maxLength={2000} placeholder="Optional — theme, ideas, questions…" />
        </label>
      </div>

      {/* Honeypot */}
      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {(error || status === 'error') && (
        <p className="form__error" role="alert">
          {error || 'Something went wrong. Please try again, or WhatsApp us directly.'}
        </p>
      )}

      <div className="evq__nav">
        {step > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => goTo(step - 1)}>
            Back
          </button>
        )}
        <button className="btn btn--primary" type="submit" disabled={status === 'sending'}>
          {step < last ? 'Next' : status === 'sending' ? 'Sending…' : '🎉 Send my details'}
        </button>
      </div>
    </form>
  )
}
