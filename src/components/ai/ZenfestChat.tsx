'use client'

// The Zenfest AI chat itself, used by the desktop side panel, the phone full-screen
// view and /plan. State lives in ZenfestAIProvider.
import Link from 'next/link'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { submitContact } from '../../app/(frontend)/plan/actions'
import { formatRange, formatRupees, type ChatItem, type SpecialistCard } from '../../lib/ai/types'
import { telLink, whatsappLink } from '../../lib/site'
import { IntakeForm } from './IntakeForm'
import { useZenfestAI, type SavedChat } from './ZenfestAIProvider'

const UNIT: Record<string, string> = { plate: 'plates', person: 'people', hour: 'hrs', event: '' }

/** Minimal formatting for Zenfest's replies: **bold** and line breaks. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>,
      )}
    </>
  )
}

function SpecialistCardView({ card }: { card: SpecialistCard }) {
  return (
    <article className="zai-card" aria-label={`${card.agentName} suggestions`}>
      <header className="zai-card__head">
        <span className="zai-card__emoji" aria-hidden="true">
          {card.emoji}
        </span>
        <span className="zai-card__name">{card.agentName}</span>
        <span className="zai-card__tag">Specialist</span>
      </header>
      <p className="zai-card__summary">{card.summary}</p>
      {card.picks.length > 0 && (
        <ul className="zai-card__picks">
          {card.picks.map((p, i) => (
            <li key={i}>
              <span className="zai-card__pick">
                {p.name}
                {p.unit !== 'event' || p.qty > 1 ? (
                  <span className="zai-card__qty">
                    {' '}
                    × {p.qty} {UNIT[p.unit] ?? ''}
                  </span>
                ) : null}
              </span>
              <span className="zai-card__price">
                {p.min == null ? 'on request' : formatRange({ min: p.min, max: p.max ?? p.min })}
              </span>
              {p.why && <span className="zai-card__why">{p.why}</span>}
            </li>
          ))}
        </ul>
      )}
      {card.estimate && (
        <p className="zai-card__total">
          <span>Estimate{card.priceOnRequest ? ' (priced items)' : ''}</span>
          <strong>{formatRange(card.estimate)}</strong>
        </p>
      )}
      {card.notes && <p className="zai-card__notes">{card.notes}</p>}
      {card.questions.length > 0 && (
        <div className="zai-card__questions">
          <p>{card.agentName.replace(/^Zenfest\s+/i, '')} would like to know:</p>
          <ul>
            {card.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

function ContactCard({ reason }: { reason: string }) {
  const { session, contactDone, markContactDone } = useZenfestAI()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (contactDone) {
    return <p className="zai-done">✓ Your details are with our team. They&apos;ll call you to confirm everything.</p>
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      setError('Send a message first so we can attach your plan.')
      return
    }
    setSending(true)
    setError('')
    const res = await submitContact({ ...session, name, phone, consent, company })
    setSending(false)
    if (res.ok) markContactDone(res.message)
    else setError(res.error)
  }

  return (
    <form className="zai-contact" onSubmit={submit}>
      <p className="zai-contact__title">{reason || 'Get a confirmed quote from our team'}</p>
      <div className="zai-contact__row">
        <label>
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={120} />
        </label>
        <label>
          <span>Mobile number</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile"
            required
            maxLength={16}
          />
        </label>
      </div>
      <input
        className="zai-hp"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        name="company"
      />
      <label className="zai-contact__consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Zenfest Events may call or WhatsApp me about this plan.</span>
      </label>
      {error && <p className="zai-contact__error">{error}</p>}
      <button className="btn btn--primary" type="submit" disabled={sending}>
        {sending ? 'Sending…' : 'Send to the Zenfest team'}
      </button>
    </form>
  )
}

function HandoffCard({ reason }: { reason: string }) {
  const { whatsapp, phone } = useZenfestAI()
  return (
    <div className="zai-handoff">
      <p>{reason || 'Our team can help you with this directly.'}</p>
      <div className="btn-row">
        {whatsapp && (
          <a className="btn btn--whatsapp" href={whatsappLink(whatsapp, 'Hi Zenfest Events, I was chatting with Zenfest AI and need help.')} target="_blank" rel="noopener">
            WhatsApp us
          </a>
        )}
        {phone && (
          <a className="btn btn--ghost" href={telLink(phone)}>
            Call {phone}
          </a>
        )}
      </div>
      <ContactCard reason="Or leave your number and we'll call you" />
    </div>
  )
}

function IntakeCard({ rows }: { rows: [string, string][] }) {
  return (
    <section className="zai-eventcard" aria-label="Your event details">
      <p className="zai-eventcard__title">Your event</p>
      <dl>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  )
}

function Item({ item }: { item: ChatItem }) {
  switch (item.kind) {
    case 'intake':
      return <IntakeCard rows={item.rows} />
    case 'user':
      return <p className="zai-msg zai-msg--user">{item.text}</p>
    case 'assistant':
      return (
        <div className="zai-msg zai-msg--zenfest">
          <RichText text={item.text} />
        </div>
      )
    case 'specialist':
      return <SpecialistCardView card={item.card} />
    case 'contact':
      return <ContactCard reason={item.reason} />
    case 'handoff':
      return <HandoffCard reason={item.reason} />
    case 'notice':
      return <p className="zai-notice">{item.text}</p>
  }
}

/** Sum of the latest estimate from each specialist. */
function usePlanTotal(items: ChatItem[]) {
  return useMemo(() => {
    const latest = new Map<string, SpecialistCard>()
    for (const i of items) if (i.kind === 'specialist') latest.set(i.card.service, i.card)
    let min = 0
    let max = 0
    let n = 0
    for (const c of latest.values()) {
      if (!c.estimate) continue
      min += c.estimate.min
      max += c.estimate.max
      n++
    }
    return n > 1 ? { min, max, n } : null
  }, [items])
}

/** "just now", "5 min ago", "3 h ago", or a date. */
function ago(ms: number): string {
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 24 * 60) return `${Math.round(m / 60)} h ago`
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** This browser's earlier chats; picking one reopens it. */
function ChatHistory({ onDone }: { onDone: () => void }) {
  const { history, session, switchTo, busy } = useZenfestAI()
  const [error, setError] = useState('')
  const pick = async (c: SavedChat) => {
    if (c.conversationId === session?.conversationId) return onDone()
    const err = await switchTo(c.conversationId)
    if (err) setError(err)
    else onDone()
  }
  return (
    <div className="zai-history" role="dialog" aria-label="Previous chats">
      <div className="zai-history__head">
        <strong>Previous chats</strong>
        <button type="button" className="zai__iconbtn" onClick={onDone} aria-label="Close previous chats">
          ✕
        </button>
      </div>
      {history.length === 0 ? (
        <p className="zai-history__empty">No earlier chats on this device yet.</p>
      ) : (
        <ul>
          {history.map((c) => {
            const current = c.conversationId === session?.conversationId
            return (
              <li key={c.conversationId}>
                <button type="button" onClick={() => void pick(c)} disabled={busy} aria-current={current}>
                  <span className="zai-history__title">{c.title}</span>
                  <span className="zai-history__time">{current ? 'Open now' : ago(c.updatedAt)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="zai-history__error">{error}</p>}
    </div>
  )
}

export function ZenfestChat({ variant, onClose }: { variant: 'panel' | 'page'; onClose?: () => void }) {
  const { greeting, items, busy, working, draft, setDraft, send, reset, restore, session, history } = useZenfestAI()
  const [showHistory, setShowHistory] = useState(false)
  // Other chats to go back to (the open one doesn't count).
  const others = history.filter((c) => c.conversationId !== session?.conversationId).length
  // A new chat starts with the intake form; the message box appears once it's sent.
  const intake = !session && items.length === 0
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const total = usePlanTotal(items)

  useEffect(() => {
    void restore()
  }, [restore])

  // Keep the newest message in view while streaming.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items, working])

  useEffect(() => {
    if (variant === 'panel' && !intake) inputRef.current?.focus()
  }, [variant, intake])

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    void send(draft)
  }

  return (
    <section className={`zai zai--${variant}`} aria-label="Zenfest AI chat">
      <header className="zai__head">
        <span className="zai__avatar" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" width={36} height={36} />
        </span>
        <div className="zai__title">
          <strong>Zenfest AI</strong>
          <span>Event planner · with décor, catering, photography &amp; entertainment specialists</span>
        </div>
        {others > 0 && (
          <button
            type="button"
            className="zai__iconbtn"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            title="Previous chats"
          >
            Chats ({others})
          </button>
        )}
        {items.length > 0 && (
          // Keeps this chat in Previous chats — it only stops being the open one.
          <button type="button" className="zai__iconbtn" onClick={() => (setShowHistory(false), reset())} title="Start a new chat">
            New chat
          </button>
        )}
        {onClose && (
          <button type="button" className="zai__iconbtn zai__close" onClick={onClose} aria-label="Close Zenfest AI">
            ✕
          </button>
        )}
      </header>

      {showHistory && <ChatHistory onDone={() => setShowHistory(false)} />}

      <div className="zai__list" ref={listRef} aria-live="polite">
        <div className="zai-msg zai-msg--zenfest">{greeting}</div>
        {intake && others > 0 && (
          <button type="button" className="zai-continue" onClick={() => setShowHistory(true)}>
            ↩ Continue a previous chat ({others})
          </button>
        )}
        {intake && <IntakeForm />}
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
        {busy && !intake && (
          <p className="zai-working">
            {working.length ? `${working.join(', ')} ${working.length > 1 ? 'are' : 'is'} working on it…` : 'Zenfest is thinking…'}
          </p>
        )}
      </div>

      {total && (
        <p className="zai__total">
          Plan estimate so far ({total.n} services): <strong>{formatRupees(total.min)} – {formatRupees(total.max)}</strong>
        </p>
      )}

      <form className="zai__composer" onSubmit={submit} hidden={intake}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          maxLength={1500}
          placeholder="Tell Zenfest about your event…"
          aria-label="Message Zenfest AI"
        />
        <button className="btn btn--primary" type="submit" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
      <p className="zai__disclaimer">
        Zenfest AI can make mistakes. Estimates only — our team confirms every plan and price.{' '}
        <Link href="/contact">Prefer a person?</Link>
      </p>
    </section>
  )
}
