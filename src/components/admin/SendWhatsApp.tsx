'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DefaultCellComponentProps } from 'payload'

import { formatPhone, reminderWaLink } from '../../lib/occasions/message'

type ButtonProps = {
  id: number | string
  phone: string
  message?: string | null
  status?: string | null
  /** `button`: the gold dashboard button; `link`: the compact list-cell link. */
  variant?: 'button' | 'link'
  onSent?: () => void
}

/**
 * Opens WhatsApp with the reminder's message typed in, and marks a waiting
 * reminder as Sent (staff press send in WhatsApp themselves).
 */
export function SendWhatsAppButton({ id, phone, message, status, variant = 'link', onSent }: ButtonProps) {
  const [current, setCurrent] = useState(status)
  const sent = current !== 'pending'

  const markSent = () => {
    if (current !== 'pending') return
    fetch(`/api/reminders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    })
      .then((res) => {
        if (!res.ok) return
        setCurrent('sent')
        onSent?.()
      })
      .catch(() => {})
  }

  return (
    <a
      href={reminderWaLink(phone, message)}
      target="_blank"
      rel="noopener"
      onClick={(e) => {
        e.stopPropagation()
        markSent()
      }}
      className={`zf-wa zf-wa--${variant}${sent ? ' zf-wa--sent' : ''}`}
      title="Opens WhatsApp with the message ready, and marks it Sent"
    >
      <WhatsAppGlyph />
      <span>{variant === 'button' ? (sent ? 'Sent · open again' : 'Send on WhatsApp') : formatPhone(phone)}</span>
      {variant === 'link' && sent && <span className="zf-wa__tick">sent</span>}
    </a>
  )
}

function WhatsAppGlyph() {
  return (
    <svg className="zf-wa__glyph" viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
      <path
        fill="currentColor"
        d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.2Z"
      />
    </svg>
  )
}

/** Reminders list cell for the phone column. */
export function SendWhatsAppCell({ cellData, rowData }: DefaultCellComponentProps) {
  const phone = typeof cellData === 'string' ? cellData : ''
  if (!phone) return <span>—</span>
  const row = rowData as { id: number; message?: string; status?: string }
  return <SendWhatsAppButton id={row.id} phone={phone} message={row.message} status={row.status} />
}

/** Runs today's check now (no email), for when contacts were just added. */
export function RunRemindersButton() {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setNote('')
    try {
      const res = await fetch('/api/reminders/cron?digest=0', { method: 'POST', credentials: 'include' })
      const body = await res.json()
      setNote(
        res.ok
          ? body.created
            ? `${body.created} new reminder${body.created === 1 ? '' : 's'} added.`
            : 'Checked — nothing new is due.'
          : body.error || 'Check failed. Try again.',
      )
      router.refresh()
    } catch {
      setNote('Check failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="zf-run">
      <button type="button" className="zf-btn zf-btn--ghost" onClick={run} disabled={busy}>
        {busy ? 'Checking…' : 'Check now'}
      </button>
      {note && (
        <span className="zf-run__note" role="status">
          {note}
        </span>
      )}
    </span>
  )
}
