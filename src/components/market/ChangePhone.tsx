'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

import { changeMyPhone } from '../../lib/authActions'
import { PhoneVerify, type PhoneProof, type VerifyMode } from '../PhoneVerify'

type Props = {
  kind: 'vendor' | 'customer'
  phone: string
  verified: boolean
  verifyMode: VerifyMode
  hint: string
}

/**
 * The account's WhatsApp number in a dashboard. With WhatsApp-only accounts the
 * number is the login, so it can't be typed over: a new number is verified on
 * WhatsApp first (lib/whatsappAuth.ts → changeAccountPhone).
 */
export function ChangePhone({ kind, phone, verified, verifyMode, hint }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onVerified(proof: PhoneProof) {
    if (!proof) return
    const input = document.getElementById('phone-verify-input') as HTMLInputElement | null
    setBusy(true)
    setError('')
    const res = await changeMyPhone({ kind, phone: input?.value ?? '', phoneProof: proof })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setOpen(false)
    setMessage(`Done. You'll log in with ${res.phone} from now on.`)
    router.refresh()
  }

  return (
    <div className="field">
      <span className="field__label">WhatsApp number (your login)</span>
      <p style={{ margin: 0 }}>
        <strong>{phone}</strong> {verified && <span className="muted">✓ Verified on WhatsApp</span>}
      </p>
      <span className="field__hint">{hint}</span>
      {!open ? (
        <button type="button" className="auth__linkbtn" onClick={() => setOpen(true)}>
          Change number
        </button>
      ) : (
        <div>
          <PhoneVerify mode={verifyMode} purpose={`${kind}-change-number`} onVerified={onVerified} />
          {busy && <p className="field__hint">Saving…</p>}
          <button type="button" className="auth__linkbtn" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
      {message && (
        <p className="field__hint" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
