'use client'

import React, { useEffect, useRef, useState } from 'react'

import { LEAD_EVENT_TYPES } from '../../lib/registryOptions'

/**
 * Sticky "Plan with Zenfest" banner on every guest registry page. Opens a
 * four-field drawer that POSTs to /api/registry-leads (public create, admin read).
 */
export function PlanBanner({ referringEvent }: { referringEvent: string }) {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if ((fd.get('company') as string)?.trim()) {
      setStatus('done')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch('/api/registry-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          phone: fd.get('phone'),
          eventType: fd.get('eventType') || undefined,
          tentativeDate: fd.get('tentativeDate') || undefined,
          city: fd.get('city') || undefined,
          referringEvent,
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      {!hidden && (
        <aside className="reg-plan" aria-label="Zenfest Events">
          <p className="reg-plan__text">
            <strong>Planning a celebration?</strong>{' '}
            <span>Zenfest plans weddings, birthdays &amp; corporate events across India.</span>
          </p>
          <button type="button" className="btn btn--primary reg-plan__btn" onClick={() => setOpen(true)}>
            Plan with Zenfest
          </button>
          <button
            type="button"
            className="reg-plan__close"
            aria-label="Hide this banner"
            onClick={() => setHidden(true)}
          >
            ×
          </button>
        </aside>
      )}

      <dialog ref={dialogRef} className="reg-dialog" onClose={() => setOpen(false)} aria-labelledby="plan-title">
        <div className="reg-dialog__inner">
          <button type="button" className="reg-dialog__close" aria-label="Close" onClick={() => setOpen(false)}>
            ×
          </button>
          {status === 'done' ? (
            <div className="form-success">
              <h2 className="display-m" id="plan-title">
                Thank you!
              </h2>
              <p className="muted">Our team will call or WhatsApp you within a day to talk about your celebration.</p>
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                Back to the registry
              </button>
            </div>
          ) : (
            <>
              <p className="eyebrow">Zenfest Events</p>
              <h2 className="reg-dialog__title" id="plan-title">
                Let’s plan your celebration
              </h2>
              <p className="muted">Tell us a little — we’ll call you back. No obligation.</p>
              <form className="form" onSubmit={onSubmit}>
                <input type="text" name="company" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <label className="field">
                  <span className="field__label">Your name *</span>
                  <input name="name" required maxLength={120} autoComplete="name" />
                </label>
                <label className="field">
                  <span className="field__label">Mobile number *</span>
                  <input
                    name="phone"
                    type="tel"
                    required
                    inputMode="tel"
                    pattern="[+0-9 \-]{10,16}"
                    autoComplete="tel"
                  />
                </label>
                <div className="form__row">
                  <label className="field">
                    <span className="field__label">Event</span>
                    <select name="eventType" defaultValue="">
                      <option value="">Choose one</option>
                      {LEAD_EVENT_TYPES.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Tentative date</span>
                    <input name="tentativeDate" type="date" />
                  </label>
                </div>
                <label className="field">
                  <span className="field__label">City</span>
                  <input name="city" maxLength={80} autoComplete="address-level2" />
                </label>
                {status === 'error' && (
                  <p className="form__error">Couldn’t send that. Please check your connection and try again.</p>
                )}
                <button className="btn btn--primary form__submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Request a callback'}
                </button>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
