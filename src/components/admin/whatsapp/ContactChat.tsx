'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type Message = {
  id: string | number
  direction: 'in' | 'out'
  text?: string | null
  status?: string | null
  error?: string | null
  at: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const TICKS: Record<string, string> = { sent: '✓', delivered: '✓✓', read: '✓✓ read', failed: '⚠ failed' }

const time = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/**
 * The chat with one WhatsApp contact (a `ui` field on WhatsApp Contacts), with a
 * reply box. WhatsApp allows free-form replies only within 24 hours of the
 * person's last message, so the box closes after that.
 */
export function ContactChat() {
  const { id } = useDocumentInfo()
  const [messages, setMessages] = useState<Message[]>([])
  const [lastInbound, setLastInbound] = useState<string | null>(null)
  const [now, setNow] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const [msgs, contact] = await Promise.all([
      fetch(`/api/whatsapp-messages?where[contact][equals]=${id}&sort=-at&limit=200&depth=0`, { credentials: 'include' }),
      fetch(`/api/whatsapp-contacts/${id}?depth=0`, { credentials: 'include' }),
    ])
    if (msgs.ok) setMessages(((await msgs.json()).docs as Message[]).reverse())
    if (contact.ok) setLastInbound((await contact.json()).lastInboundAt ?? null)
    setNow(Date.now())
  }, [id])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const t = setInterval(load, 10000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [load])

  if (!id) return null

  const windowOpen = lastInbound ? now - new Date(lastInbound).getTime() < DAY_MS : false
  const closesAt = lastInbound ? new Date(new Date(lastInbound).getTime() + DAY_MS).toISOString() : null

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/whatsapp-contacts/${id}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Could not send.')
      else {
        setText('')
        load()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ margin: '1.5rem 0' }}>
      <h3 style={{ margin: '0 0 0.6rem' }}>WhatsApp chat</h3>
      <div
        style={{
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 8,
          padding: '0.8rem',
          maxHeight: 420,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: 'var(--theme-elevation-50)',
        }}
      >
        {messages.length === 0 && <p style={{ margin: 0, opacity: 0.7 }}>No messages yet.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.direction === 'out' ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
              padding: '0.5rem 0.7rem',
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              background: m.direction === 'out' ? 'var(--theme-success-100)' : 'var(--theme-elevation-0)',
              border: '1px solid var(--theme-elevation-100)',
            }}
          >
            <div>{m.text || '—'}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: 4, textAlign: 'right' }}>
              {time(m.at)} {m.direction === 'out' && TICKS[m.status ?? '']}
              {m.error && <span title={m.error}> · {m.error.slice(0, 60)}</span>}
            </div>
          </div>
        ))}
      </div>

      {windowOpen ? (
        <div style={{ marginTop: '0.8rem' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Type a reply…"
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6 }}
            disabled={busy}
          />
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '0.4rem' }}>
            <button
              type="button"
              className="btn btn--style-primary btn--size-medium"
              onClick={send}
              disabled={busy || !text.trim()}
              style={{ margin: 0 }}
            >
              {busy ? 'Sending…' : 'Send reply'}
            </button>
            <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>
              Free replies until {closesAt && time(closesAt)}.
            </span>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: '0.8rem', fontSize: '0.9rem', opacity: 0.8 }}>
          {lastInbound
            ? 'More than 24 hours since their last message — WhatsApp only allows an approved template now (send a campaign) or call them.'
            : "They haven't messaged this number yet — reach them with a campaign template first."}
        </p>
      )}
      {error && <p style={{ color: 'var(--theme-error-500)', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
