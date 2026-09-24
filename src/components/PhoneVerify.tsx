'use client'

import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

export type VerifyMode = 'live' | 'test' | 'off'
export type PhoneProof = { id: string | number; token: string } | null

type Props = {
  mode: VerifyMode
  /** What the form is for, stored on the verification record. */
  purpose: string
  /** Called with the proof once WhatsApp confirms the number, and with null when it's reset. */
  onVerified: (proof: PhoneProof) => void
}

type Stage = 'idle' | 'starting' | 'waiting' | 'verified' | 'expired'

const POLL_MS = 2000

/**
 * Phone input + WhatsApp "reverse" verification. The visitor taps Verify, then
 * "Open WhatsApp" sends a prefilled code to our number (on a laptop they can
 * scan the QR code instead). We poll until the webhook confirms the sender, then
 * hand `{ id, token }` to the form. In "off" mode it's just the phone input.
 */
export function PhoneVerify({ mode, purpose, onVerified }: Props) {
  const [phone, setPhone] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [qr, setQr] = useState('')
  const proof = useRef<{ id: string | number; token: string } | null>(null)

  // Poll the status while we're waiting for the WhatsApp message.
  useEffect(() => {
    if (stage !== 'waiting' || !proof.current) return
    const { id, token } = proof.current
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/phone-verifications/status?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
        )
        const data = await res.json()
        if (data.status === 'verified') {
          setStage('verified')
          onVerified({ id, token })
        } else if (data.status === 'expired') {
          setStage('expired')
        }
      } catch {
        // Network blip: keep polling.
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [stage, onVerified])

  function onPhoneChange(value: string) {
    setPhone(value)
    setError('')
    if (stage !== 'idle') {
      setStage('idle')
      proof.current = null
      onVerified(null)
    }
  }

  async function start() {
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Enter a valid 10-digit mobile number first.')
      return
    }
    setStage('starting')
    setError('')
    try {
      const res = await fetch('/api/phone-verifications/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, purpose }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start verification.')
      proof.current = { id: data.id, token: data.token }
      setLink(data.waLink)
      setQr(mode === 'live' ? await QRCode.toString(data.waLink, { type: 'svg', margin: 1 }) : '')
      setStage('waiting')
    } catch (err) {
      setStage('idle')
      setError(err instanceof Error ? err.message : 'Could not start verification.')
    }
  }

  async function simulate() {
    if (!proof.current) return
    await fetch('/api/phone-verifications/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof.current),
    })
  }

  const locked = stage === 'waiting' || stage === 'verified'

  return (
    <div className="field phone-verify">
      <label className="field__label" htmlFor="phone-verify-input">
        Phone *
      </label>
      <div className="phone-verify__row">
        <input
          id="phone-verify-input"
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="10-digit mobile"
          value={phone}
          readOnly={locked}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
        {mode !== 'off' && stage !== 'verified' && stage !== 'waiting' && (
          <button
            type="button"
            className="btn btn--whatsapp phone-verify__btn"
            onClick={start}
            disabled={stage === 'starting'}
          >
            {stage === 'starting' ? 'Starting…' : 'Verify on WhatsApp'}
          </button>
        )}
        {locked && (
          <button type="button" className="btn btn--ghost phone-verify__btn" onClick={() => onPhoneChange(phone)}>
            Change
          </button>
        )}
      </div>

      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}

      {mode !== 'off' && (
        <p className={`phone-verify__status phone-verify__status--${stage}`} aria-live="polite">
          {stage === 'verified'
            ? '✓ Verified on WhatsApp'
            : stage === 'waiting'
              ? 'Waiting for your WhatsApp message… this ticks by itself once it arrives.'
              : stage === 'expired'
                ? 'That code expired. Tap Verify on WhatsApp to get a new one.'
                : 'We check your number with a quick WhatsApp message — it costs you nothing.'}
        </p>
      )}

      {stage === 'waiting' && (
        <div className="phone-verify__steps">
          {mode === 'live' ? (
            <>
              <div>
                <p className="field__hint">
                  Tap below — WhatsApp opens with a message ready. Just press <strong>Send</strong>{' '}
                  and come back here.
                </p>
                <a className="btn btn--whatsapp" href={link} target="_blank" rel="noopener">
                  Open WhatsApp
                </a>
              </div>
              {qr && (
                <div className="phone-verify__qr">
                  <div
                    className="phone-verify__qr-img"
                    role="img"
                    aria-label="QR code that opens WhatsApp with the verification message"
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <p className="field__hint">On a laptop? Scan with your phone camera.</p>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="field__hint">
                Test mode — WhatsApp isn&apos;t connected yet, so this button stands in for
                sending the message.
              </p>
              <button type="button" className="btn btn--ghost" onClick={simulate}>
                Simulate WhatsApp send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
