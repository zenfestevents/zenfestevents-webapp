'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { sendEnquiry } from '../../app/(frontend)/account/actions'
import { EVENT_TYPES, MARKET_AREAS } from '../../lib/marketplaceOptions'
import { todayKey } from './MonthCalendar'

/**
 * "Request a quote" on a vendor's listing. Couples must be logged in — that's
 * what makes every enquiry a real one; logged-out visitors get log-in / sign-up
 * links that bring them back here.
 */
export function QuoteForm({
  slug,
  vendorName,
  loggedIn,
  blockedDates,
  defaults,
}: {
  slug: string
  vendorName: string
  loggedIn: boolean
  blockedDates: string[]
  defaults: { eventDate: string; area: string }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState(defaults.eventDate)
  const here = `/marketplace/v/${slug}#quote`

  if (!loggedIn) {
    return (
      <div className="quote quote--locked">
        <p>
          <strong>Log in to ask {vendorName} for a quote.</strong> It takes a minute, and keeps your conversation and
          their reply in one place.
        </p>
        <div className="btn-row">
          <Link className="btn btn--primary" href={`/account/signup?next=${encodeURIComponent(here)}`}>
            Create free account
          </Link>
          <Link className="btn btn--ghost" href={`/account/login?next=${encodeURIComponent(here)}`}>
            Log in
          </Link>
        </div>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const fd = new FormData(form)
    const s = (k: string) => String(fd.get(k) ?? '')
    setBusy(true)
    setError('')
    const res = await sendEnquiry({
      vendorSlug: slug,
      eventType: s('eventType'),
      eventDate: s('eventDate'),
      guests: s('guests'),
      area: s('area'),
      budget: s('budget'),
      message: s('message'),
    }).catch(() => null)
    setBusy(false)
    if (!res) return setError('Something went wrong. Please try again.')
    if (!res.ok) {
      if (res.login) router.push(`/account/login?next=${encodeURIComponent(here)}`)
      return setError(res.error)
    }
    router.push(
      res.existing
        ? '/account?tab=enquiries'
        : `/account?tab=enquiries&sent=${encodeURIComponent(vendorName)}`,
    )
  }

  const clash = date && blockedDates.includes(date)

  return (
    <form className="form quote" onSubmit={onSubmit} noValidate>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Event *</span>
          <select name="eventType" defaultValue="wedding" required>
            {EVENT_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Date</span>
          <input name="eventDate" type="date" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {clash && <p className="form__error">{vendorName} has marked this date as booked — you can still ask.</p>}
      <div className="form__row">
        <label className="field">
          <span className="field__label">Guests</span>
          <input name="guests" type="number" min={1} inputMode="numeric" placeholder="e.g. 300" />
        </label>
        <label className="field">
          <span className="field__label">Your budget for this (₹)</span>
          <input name="budget" type="number" min={0} inputMode="numeric" placeholder="e.g. 50000" />
        </label>
      </div>
      <label className="field">
        <span className="field__label">Area / venue</span>
        <input name="area" defaultValue={defaults.area} list="quote-areas" placeholder="e.g. Tambaram" />
        <datalist id="quote-areas">
          {MARKET_AREAS.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </label>
      <label className="field">
        <span className="field__label">What do you need? *</span>
        <textarea
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          placeholder="e.g. Candid photos for a wedding + reception, about 8 hours, need the album in 30 days."
        />
      </label>
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--gold form__submit" type="submit" disabled={busy}>
        {busy ? 'Sending…' : `Request a quote`}
      </button>
      <p className="field__hint">Your name and phone are shared with {vendorName} only.</p>
    </form>
  )
}
