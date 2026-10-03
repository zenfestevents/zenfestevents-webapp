'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { forgotPassword, logIn, resetPassword, signUp } from '../../lib/authActions'
import { MARKET_AREAS, MARKET_CATEGORIES, PASSWORD_MIN } from '../../lib/marketplaceOptions'
import { PhoneVerify, type PhoneProof, type VerifyMode } from '../PhoneVerify'

type Kind = 'vendor' | 'customer'
type Mode = 'signup' | 'login' | 'forgot' | 'reset'

const PATHS = {
  vendor: { signup: '/vendors/signup', login: '/vendors/login', forgot: '/vendors/forgot-password' },
  customer: { signup: '/account/signup', login: '/account/login', forgot: '/account/forgot-password' },
}

type Props = {
  kind: Kind
  mode: Mode
  verifyMode?: VerifyMode
  next?: string
  token?: string
}

/** Sign-up / log-in / forgot / reset for vendor and couple accounts. */
export function AuthForm({ kind, mode, verifyMode = 'off', next, token }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [proof, setProof] = useState<PhoneProof>(null)
  const [category, setCategory] = useState('')
  const [showPw, setShowPw] = useState(false)
  const paths = PATHS[kind]
  const withNext = (p: string) => (next ? `${p}?next=${encodeURIComponent(next)}` : p)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const fd = new FormData(form)
    const s = (k: string) => String(fd.get(k) ?? '')
    if (mode === 'signup' && verifyMode !== 'off' && !proof) {
      setError('Verify your phone number on WhatsApp first.')
      return
    }
    if ((mode === 'signup' || mode === 'reset') && s('password') !== s('confirm')) {
      setError('The two passwords don’t match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (mode === 'forgot') {
        const res = await forgotPassword({ kind, email: s('email') })
        if (!res.ok) throw new Error(res.error)
        setSent(true)
        return
      }
      const res =
        mode === 'signup'
          ? await signUp({
              kind,
              name: s('name'),
              email: s('email'),
              password: s('password'),
              phone: s('phone'),
              phoneProof: proof,
              businessName: s('businessName'),
              category: s('category'),
              otherService: s('otherService'),
              city: s('city'),
              eventDate: s('eventDate'),
              consent: fd.get('consent') === 'on',
              next,
              company: s('company'),
            })
          : mode === 'login'
            ? await logIn({ kind, email: s('email'), password: s('password'), next })
            : await resetPassword({ kind, token: token ?? '', password: s('password') })
      if (!res.ok) throw new Error(res.error)
      router.push(res.redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="form-success" role="status">
        <h2 className="display-m">Check your email</h2>
        <p className="muted">
          If there&apos;s an account with that email, we&apos;ve sent a link to set a new password.
          It works for one hour. Don&apos;t see it? Check spam, or WhatsApp us.
        </p>
        <Link className="btn btn--ghost" href={paths.login}>
          Back to log in
        </Link>
      </div>
    )
  }

  const password = (label: string, autoComplete: string) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="auth__pw">
        <input
          name="password"
          type={showPw ? 'text' : 'password'}
          required
          minLength={mode === 'login' ? 1 : PASSWORD_MIN}
          autoComplete={autoComplete}
        />
        <button type="button" className="auth__pw-toggle" onClick={() => setShowPw((v) => !v)}>
          {showPw ? 'Hide' : 'Show'}
        </button>
      </span>
      {mode !== 'login' && <span className="field__hint">At least {PASSWORD_MIN} characters.</span>}
    </label>
  )

  return (
    <form className="form auth" onSubmit={onSubmit} noValidate>
      {mode === 'signup' && (
        <>
          <label className="field">
            <span className="field__label">Your name *</span>
            <input name="name" required autoComplete="name" minLength={2} />
          </label>
          {kind === 'vendor' && (
            <>
              <label className="field">
                <span className="field__label">Business name *</span>
                <input name="businessName" required autoComplete="organization" minLength={2} />
              </label>
              <label className="field">
                <span className="field__label">What you offer *</span>
                <select name="category" required value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="" disabled>
                    Choose one
                  </option>
                  {MARKET_CATEGORIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {category === 'other' && (
                <label className="field">
                  <span className="field__label">Which service? *</span>
                  <input name="otherService" required placeholder="e.g. Nadaswaram, Photo booth" />
                </label>
              )}
            </>
          )}
          <PhoneVerify mode={verifyMode} purpose={kind === 'vendor' ? 'vendor-account' : 'customer-account'} onVerified={setProof} />
        </>
      )}

      {mode !== 'reset' && (
        <label className="field">
          <span className="field__label">Email {mode === 'signup' ? '*' : ''}</span>
          <input name="email" type="email" required autoComplete="email" spellCheck={false} />
        </label>
      )}

      {mode === 'signup' && password('Create a password *', 'new-password')}
      {mode === 'login' && password('Password', 'current-password')}
      {mode === 'reset' && password('New password *', 'new-password')}
      {(mode === 'signup' || mode === 'reset') && (
        <label className="field">
          <span className="field__label">Type it again *</span>
          <input name="confirm" type={showPw ? 'text' : 'password'} required autoComplete="new-password" />
        </label>
      )}

      {mode === 'signup' && kind === 'customer' && (
        <>
          <div className="form__row">
            <label className="field">
              <span className="field__label">Your area</span>
              <input name="city" list="auth-areas" placeholder="e.g. Tambaram" autoComplete="address-level2" />
              <datalist id="auth-areas">
                {MARKET_AREAS.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span className="field__label">Event date (if fixed)</span>
              <input name="eventDate" type="date" />
            </label>
          </div>
          <label className="choice__option field__hint">
            <input type="checkbox" name="consent" />
            <span>Send me offers and planning tips on WhatsApp / email (optional)</span>
          </label>
        </>
      )}

      {mode === 'login' && (
        <p className="auth__aside">
          <Link href={paths.forgot}>Forgot password?</Link>
        </p>
      )}

      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}

      <button className="btn btn--primary form__submit" type="submit" disabled={busy}>
        {busy
          ? 'Please wait…'
          : mode === 'signup'
            ? kind === 'vendor'
              ? 'Create vendor account'
              : 'Create account'
            : mode === 'login'
              ? 'Log in'
              : mode === 'forgot'
                ? 'Email me a reset link'
                : 'Set new password'}
      </button>

      <p className="auth__switch muted">
        {mode === 'signup' ? (
          <>
            Already have an account? <Link href={withNext(paths.login)}>Log in</Link>
          </>
        ) : mode === 'login' ? (
          <>
            New here? <Link href={withNext(paths.signup)}>Create an account</Link>
          </>
        ) : (
          <Link href={paths.login}>Back to log in</Link>
        )}
      </p>
    </form>
  )
}
