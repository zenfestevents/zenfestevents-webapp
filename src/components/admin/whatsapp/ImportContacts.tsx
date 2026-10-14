'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Above the WhatsApp Contacts list: paste rows copied from Excel / Google Sheets
 * ("name, phone" — either order, comma or tab separated) to add them in one go.
 */
export function ImportContacts() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [optedIn, setOptedIn] = useState(false)
  const [source, setSource] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')

  const submit = async () => {
    setBusy(true)
    setResult('')
    try {
      const res = await fetch('/api/whatsapp-contacts/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, optedIn, source, tags }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult(data.error || 'Import failed.')
        return
      }
      setResult(
        `Added ${data.added}, updated ${data.updated}.` +
          (data.skippedCount ? ` Skipped ${data.skippedCount} line(s) without a valid number: ${data.skipped.join(' / ')}` : ''),
      )
      setText('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div style={{ margin: '0 0 1rem' }}>
        <button type="button" className="btn btn--style-secondary btn--size-small" onClick={() => setOpen(true)} style={{ margin: 0 }}>
          Import from Excel / Google Sheets
        </button>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 8, padding: '1rem', margin: '0 0 1.2rem' }}>
      <h4 style={{ margin: '0 0 0.4rem' }}>Import contacts</h4>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', opacity: 0.8 }}>
        Copy the <strong>name</strong> and <strong>phone</strong> columns from your sheet and paste them here, one person per line.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={'Priya Sharma\t9876543210\nArun, +91 98400 12345'}
        style={{ width: '100%', padding: '0.6rem', fontFamily: 'monospace', borderRadius: 6 }}
        disabled={busy}
      />
      <div style={{ display: 'grid', gap: '0.5rem', margin: '0.6rem 0', gridTemplateColumns: '1fr 1fr' }}>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (optional), e.g. wedding, 2025 clients" style={{ padding: '0.45rem 0.6rem' }} />
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Where they agreed, e.g. Website form, Expo sign-up sheet"
          style={{ padding: '0.45rem 0.6rem' }}
        />
      </div>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.9rem' }}>
        <input type="checkbox" checked={optedIn} onChange={(e) => setOptedIn(e.target.checked)} />
        <span>
          Everyone on this list agreed to receive WhatsApp updates and offers from Zenfest Events. Leave unticked if you are not sure,
          because messaging people who did not agree gets the number blocked.
        </span>
      </label>
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem' }}>
        <button type="button" className="btn btn--style-primary btn--size-small" onClick={submit} disabled={busy || !text.trim()} style={{ margin: 0 }}>
          {busy ? 'Importing…' : 'Import'}
        </button>
        <button type="button" className="btn btn--style-secondary btn--size-small" onClick={() => setOpen(false)} disabled={busy} style={{ margin: 0 }}>
          Close
        </button>
      </div>
      {result && <p style={{ margin: '0.6rem 0 0' }}>{result}</p>}
    </div>
  )
}
