'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  completeGoogleSignUp,
  forgotPassword,
  logIn,
  resendVerification,
  resetPassword,
  signUp,
} from '../../lib/authActions'
import { MARKET_AREAS, MARKET_CATEGORIES, PASSWORD_MIN } from '../../lib/marketplaceOptions'
import { PhoneVerify, type PhoneProof, type VerifyMode } from '../PhoneVerify'

type Kind = 'vendor' | 'customer'
/** `google` = the short finish-sign-up form after a new "Continue with Google". */
type Mode = 'signup' | 'login' | 'forgot' | 'reset' | 'google'

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
  /** Show "Continue with Google" (signup / login; only when it's configured). */
  google?: boolean
  /** A message from a redirect, e.g. a failed Google sign-in. */
  notice?: string
  /** `google` mode: the name and email Google gave us. */
  prefill?: { name: string; email: string }
}

/** Sign-up / log-in / forgot / reset for vendor and couple accounts. */
export function AuthForm({ kind, mode, verifyMode = 'off', next, token, google, notice, prefill }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [proof, setProof] = useState<PhoneProof>(null)
  const [category, setCategory] = useState('')
  const [showPw, setShowPw] = useState(false)
  // After sign-up: "check your inbox" for this address. After a login refused for
  // an unconfirmed email: offer to resend to the address they typed.
  const [checkEmail, setCheckEmail] = useState('')
  const [unconfirmed, setUnconfirmed] = useState('')
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
    if ((mode === 'signup' || mode === 'google') && verifyMode !== 'off' && !proof) {
      setError('Verify your phone number on WhatsApp first.')
      return
    }
    if ((mode === 'signup' || mode === 'reset') && s('password') !== s('confirm')) {
      setError('The two passwords don’t match.')
      return
    }
    setBusy(true)
    setError('')
    setUnconfirmed('')
    try {
      if (mode === 'forgot') {
        const res = await forgotPassword({ kind, email: s('email') })
        if (!res.ok) throw new Error(res.error)
        setSent(true)
        return
      }
      const details = {
        name: s('name'),
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
      }
      const res =
        mode === 'google'
          ? await completeGoogleSignUp(details)
          : mode === 'signup'
          ? await signUp({ kind, email: s('email'), password: s('password'), ...details })
          : mode === 'login'
            ? await logIn({ kind, email: s('email'), password: s('password'), next })
            : await resetPassword({ kind, token: token ?? '', password: s('password') })
      if (!res.ok) {
        if ('unverified' in res && res.unverified) setUnconfirmed(s('email'))
        throw new Error(res.error)
      }
      if ('checkEmail' in res) {
        setCheckEmail(res.checkEmail)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      router.push(res.redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="form-success" role="status">
        <h2 className="display-m">Confirm your email</h2>
        <p className="muted">
          We&apos;ve sent a link to <strong>{checkEmail}</strong>. Open it to switch on your account, then log in.
          Don&apos;t see it in a few minutes? Check spam.
        </p>
        <ResendLink kind={kind} email={checkEmail} />
        <p className="auth__switch muted">
          Wrong email?{' '}
          <button type="button" className="auth__linkbtn" onClick={() => setCheckEmail('')}>
            Sign up again
          </button>{' '}
          · <Link href={paths.login}>Log in</Link>
        </p>
      </div>
    )
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
      {google && (mode === 'signup' || mode === 'login') && (
        <>
          <a
            className="btn auth__google"
            href={`/auth/google?kind=${kind}${next ? `&next=${encodeURIComponent(next)}` : ''}`}
          >
            <GoogleMark />
            Continue with Google
          </a>
          <p className="auth__or">
            <span>or {mode === 'signup' ? 'sign up' : 'log in'} with email</span>
          </p>
        </>
      )}

      {notice && (
        <p className="form__error" role="alert">
          {notice}
        </p>
      )}

      {mode === 'google' && prefill && (
        <p className="auth__google-as">
          <GoogleMark />
          <span>
            Signing up as <strong>{prefill.email}</strong>
          </span>
        </p>
      )}

      {(mode === 'signup' || mode === 'google') && (
        <>
          <label className="field">
            <span className="field__label">Your name *</span>
            <input name="name" required autoComplete="name" minLength={2} defaultValue={prefill?.name} />
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

      {mode !== 'reset' && mode !== 'google' && (
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

      {(mode === 'signup' || mode === 'google') && kind === 'customer' && (
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
      {unconfirmed && <ResendLink kind={kind} email={unconfirmed} />}

      <button className="btn btn--primary form__submit" type="submit" disabled={busy}>
        {busy
          ? 'Please wait…'
          : mode === 'signup' || mode === 'google'
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
        {mode === 'signup' || mode === 'google' ? (
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

/** "Resend the confirmation email" — always says sent, so it can't reveal who has an account. */
function ResendLink({ kind, email }: { kind: Kind; email: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState('')
  async function resend() {
    setState('busy')
    setError('')
    const res = await resendVerification({ kind, email })
    if (res.ok) setState('sent')
    else {
      setError(res.error)
      setState('idle')
    }
  }
  return (
    <p className="auth__resend">
      {state === 'sent' ? (
        <span role="status">Sent again — check your inbox (and spam).</span>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={resend} disabled={state === 'busy'}>
          {state === 'busy' ? 'Sending…' : 'Resend the confirmation email'}
        </button>
      )}
      {error && <span className="form__error">{error}</span>}
    </p>
  )
}

/** Google's "G" in its brand colours (shown on the Google button only). */
function GoogleMark() {
  return (
    <svg className="auth__google-mark" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
