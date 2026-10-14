'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type Summary = {
  audience: number
  left: number
  sent: number
  delivered: number
  read: number
  failed: number
  configured: boolean
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: '1rem 1.2rem',
  margin: '1.5rem 0',
}

/**
 * "Send" panel on a WhatsApp Campaign (a `ui` field). Shows who it will reach and
 * the delivery numbers, then sends in small batches (`/send-batch`) until nobody
 * is left — the page must stay open while it runs.
 */
export function CampaignSender() {
  const { id } = useDocumentInfo()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [limit, setLimit] = useState('')

  const refresh = useCallback(async () => {
    if (!id) return
    const res = await fetch(`/api/whatsapp-campaigns/${id}/summary`, { credentials: 'include' })
    if (res.ok) setSummary(await res.json())
  }, [id])

  useEffect(() => {
    const first = setTimeout(refresh, 0)
    const t = setInterval(refresh, 15000) // delivery/read ticks arrive over time
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [refresh])

  if (!id) {
    return <div style={box}>Save the campaign first. Then you can send it from here.</div>
  }

  const send = async () => {
    if (!summary) return
    const cap = limit ? Math.max(1, parseInt(limit, 10) || 0) : summary.left
    if (!window.confirm(`Send the template to ${Math.min(cap, summary.left)} people now? Meta charges for each delivered message.`)) return

    setBusy(true)
    setLog([])
    let remainingCap = cap
    try {
      while (remainingCap > 0) {
        const res = await fetch(`/api/whatsapp-campaigns/${id}/send-batch`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ max: remainingCap }),
        })
        const data = await res.json()
        if (!res.ok) {
          setLog((l) => [...l, data.error || 'Sending failed.'])
          break
        }
        remainingCap -= data.sent + data.failed
        setLog((l) => [...l, `Sent ${data.sent}, failed ${data.failed}, ${data.left} left.`, ...(data.errors ?? [])])
        if (data.left === 0 || data.sent + data.failed === 0) break
      }
    } finally {
      setBusy(false)
      refresh()
    }
  }

  return (
    <div style={box}>
      <h3 style={{ margin: '0 0 0.6rem' }}>Send this campaign</h3>
      {!summary ? (
        <p>Loading…</p>
      ) : (
        <>
          {!summary.configured && (
            <p style={{ color: 'var(--theme-error-500)' }}>
              WhatsApp sending is not set up on this server (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).
            </p>
          )}
          <p style={{ margin: '0 0 0.8rem' }}>
            <strong>{summary.audience}</strong> opted-in contacts match · <strong>{summary.left}</strong> not sent yet
          </p>
          <p style={{ margin: '0 0 1rem', opacity: 0.8 }}>
            Sent {summary.sent} · Delivered {summary.delivered} · Read {summary.read} · Failed {summary.failed}
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={1}
              placeholder={`How many (default ${summary.left})`}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              disabled={busy}
              style={{ width: 210, padding: '0.45rem 0.6rem' }}
            />
            <button
              type="button"
              className="btn btn--style-primary btn--size-medium"
              onClick={send}
              disabled={busy || !summary.configured || summary.left === 0}
            >
              {busy ? 'Sending… keep this page open' : 'Send now'}
            </button>
          </div>
          <p style={{ margin: '0.8rem 0 0', fontSize: '0.85rem', opacity: 0.75 }}>
            Save any changes before sending. Until Meta verifies the business you can reach 250 new people a day
            (then 2,000). Each person gets this campaign once.
          </p>
          {log.length > 0 && (
            <ul style={{ margin: '0.8rem 0 0', paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
              {log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
