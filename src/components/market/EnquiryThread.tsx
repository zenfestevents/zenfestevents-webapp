'use client'

import React, { useState } from 'react'

import type { EnquiryView } from '../../lib/marketplace'
import { enquiryStatusLabel, eventTypeLabel, rupees } from '../../lib/marketplaceOptions'

export function formatDay(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

export function formatWhen(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}

/** The enquiry's facts as chips: event, date, guests, area, budget. */
export function EnquiryFacts({ e }: { e: EnquiryView }) {
  const facts = [
    eventTypeLabel(e.eventType),
    e.eventDate ? formatDay(e.eventDate) : 'Date not fixed',
    e.guests ? `${e.guests} guests` : '',
    e.area,
    e.budget ? `Budget ${rupees(e.budget)}` : '',
  ].filter(Boolean)
  return (
    <ul className="enq__facts">
      {facts.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  )
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill--${status}`}>{enquiryStatusLabel(status) || status}</span>
}

/**
 * The conversation under one enquiry and a reply box. `side` is who is
 * reading: their own messages sit on the right. Vendors can attach a quote.
 */
export function EnquiryThread({
  enquiry,
  side,
  otherName,
  onReply,
  closed,
}: {
  enquiry: EnquiryView
  side: 'vendor' | 'customer'
  otherName: string
  onReply: (text: string, quote: number | null) => Promise<boolean>
  closed?: boolean
}) {
  const [text, setText] = useState('')
  const [quote, setQuote] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    const ok = await onReply(text, quote ? Number(quote) : null)
    setBusy(false)
    if (ok) {
      setText('')
      setQuote('')
    }
  }

  const first = { from: 'customer' as const, text: enquiry.message, quote: null, at: enquiry.createdAt }
  const messages = [first, ...enquiry.thread]

  return (
    <div className="enq__thread">
      <ol className="enq__messages">
        {messages.map((m, i) => (
          <li key={i} className={`enq__msg ${m.from === side ? 'is-mine' : ''}`}>
            <span className="enq__who">
              {m.from === side ? 'You' : otherName} · {formatWhen(m.at)}
            </span>
            {m.quote != null && <strong className="enq__quote">Quote: {rupees(m.quote)}</strong>}
            <p>{m.text}</p>
          </li>
        ))}
      </ol>
      {closed ? (
        <p className="field__hint">This enquiry is {enquiryStatusLabel(enquiry.status).toLowerCase()}.</p>
      ) : (
        <form className="enq__reply" onSubmit={send}>
          <label className="field">
            <span className="field__label">Reply</span>
            <textarea
              rows={3}
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              placeholder={side === 'vendor' ? 'Thank them, confirm the date, explain what the price includes…' : 'Ask a question or confirm details…'}
            />
          </label>
          {side === 'vendor' && (
            <label className="field enq__quote-input">
              <span className="field__label">Quote, all-in (₹, optional)</span>
              <input type="number" min={0} inputMode="numeric" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="e.g. 45000" />
            </label>
          )}
          <button className="btn btn--primary" type="submit" disabled={busy || !text.trim()}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  )
}
