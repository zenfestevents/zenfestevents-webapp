'use client'

import React, { useEffect, useRef, useState } from 'react'

import { identifyVoter } from '../../app/(frontend)/polls/actions'
import { PhoneVerify, type PhoneProof, type VerifyMode } from '../PhoneVerify'

/**
 * "Verify once, vote on every poll." Collects the phone (and the WhatsApp proof
 * when verification is on) plus an optional, unticked consent box, then signs
 * the visitor in as a voter via a cookie.
 */
export function VoterSheet({
  mode,
  onClose,
  onDone,
}: {
  mode: VerifyMode
  onClose: () => void
  onDone: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [proof, setProof] = useState<PhoneProof>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (mode !== 'off' && !proof) {
      setError('Tap “Verify on WhatsApp” first — it only takes a moment.')
      return
    }
    setSending(true)
    setError('')
    const res = await identifyVoter({
      phone: String(fd.get('phone') || ''),
      proof,
      consent: fd.get('consent') === 'on',
      company: String(fd.get('company') || ''),
    })
    setSending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onDone()
  }

  return (
    <dialog ref={ref} className="reg-dialog" onClose={onClose} aria-labelledby="voter-title">
      <div className="reg-dialog__inner">
        <button type="button" className="reg-dialog__close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">Zenfest Polls</p>
        <h2 className="reg-dialog__title" id="voter-title">
          {mode === 'off' ? 'One person, one vote' : 'Verify once, vote anytime'}
        </h2>
        <p className="muted">
          {mode === 'off'
            ? 'Add your mobile number so each person votes only once.'
            : 'We check your number once with a free WhatsApp message. After that you can vote on every poll.'}
        </p>
        <form className="form" onSubmit={submit}>
          <input type="text" name="company" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <PhoneVerify mode={mode} purpose="poll" onVerified={setProof} />
          <label className="choice__option poll-consent">
            <input type="checkbox" name="consent" />
            <span>Send me Zenfest event offers and poll results on WhatsApp. (Optional — unsubscribe anytime.)</span>
          </label>
          {error && <p className="form__error">{error}</p>}
          <button className="btn btn--primary form__submit" disabled={sending}>
            {sending ? 'Saving…' : 'Continue & vote'}
          </button>
          <p className="field__hint">
            We never show your number with your vote. See our <a href="/contact">contact page</a> to have it removed.
          </p>
        </form>
      </div>
    </dialog>
  )
}
