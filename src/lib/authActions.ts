'use server'

// Sign-up, log-in, log-out and password reset for vendor and couple accounts.
// These are public POST endpoints: everything is validated here, accounts are
// created with whitelisted fields only, and the session is Payload's own JWT in
// the `payload-token` cookie (see lib/session.ts).
import { randomBytes } from 'node:crypto'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { VERIFY_SUBJECT, verifyEmailHTML } from '../collections/accountAuth'
import { EMAIL_LOGIN } from './accountOptions'
import { signUpData, type SignUpDetails } from './accountSignup'
import { FEATURES } from './features'
import { UserError, fail, isEmail, text } from './formCheck'
import { PENDING_COOKIE, googleEnabled, openCookie, type PendingGoogle } from './googleAuth'
import { emailChecksOn, sendMail, siteUrl, teamInbox } from './marketplaceMail'
import { PASSWORD_MIN, categoryLabel } from './marketplaceOptions'
import { getPayloadClient } from './payload'
import { consumePhoneProof, verifyMode } from './phoneVerification'
import { rateLimited } from './rateLimit'
import { awardQuietly } from './rewards'
import {
  ACCOUNT,
  clearSessionCookie,
  getCustomer,
  getVendor,
  safeNext,
  setSessionCookie,
  startSession,
  type AccountKind,
} from './session'
import { changeAccountPhone, createWhatsAppAccount, whatsAppLoginAccount } from './whatsappAuth'

type AuthResult =
  | { ok: true; redirect: string }
  /** Signed up; the account works once the emailed link is clicked. */
  | { ok: true; checkEmail: string }
  | { ok: false; error: string; unverified?: true }

const kindOf = (v: unknown): AccountKind => (v === 'vendor' ? 'vendor' : 'customer')

export type SignUpInput = SignUpDetails & {
  kind: AccountKind
  email: string
  password: string
}

const EMAIL_OFF = 'Sign up and log in with your WhatsApp number.'

/**
 * The sign-up fields shared by the email form and the Google "finish sign-up"
 * form: name, phone and the vendor / couple extras. Consumes the WhatsApp proof,
 * so it runs every other check first (the proof is one-time).
 */
async function checkSignUpFields(
  kind: AccountKind,
  input: Omit<SignUpInput, 'kind' | 'email' | 'password'>,
  email: string,
) {
  const { collection } = ACCOUNT[kind]
  const { data, phone } = await signUpData(kind, input)

  const payload = await getPayloadClient()
  const existing = await payload.count({
    collection,
    where: { email: { equals: email } },
    overrideAccess: true,
  })
  if (existing.totalDocs) {
    throw new UserError('An account with this email already exists. Log in instead.')
  }

  // Checked last: consuming the WhatsApp proof is one-time.
  data.phoneVerified = false
  if (verifyMode() !== 'off') {
    if (!(await consumePhoneProof(payload, input.phoneProof, phone))) {
      throw new UserError('Verify your phone number on WhatsApp first.')
    }
    data.phoneVerified = true
  }
  return data
}

async function tellTeamAboutVendor(data: Record<string, unknown>, email: string, id: number | string, how: string) {
  await sendMail(teamInbox(), `New vendor sign-up: ${data.businessName}`, [
    `${data.name} signed up as a ${categoryLabel(data.category)} vendor (${how}).`,
    `Business: ${data.businessName}`,
    `Phone: ${data.phone}${data.phoneVerified ? ' (verified on WhatsApp)' : ''}`,
    `Email: ${email}`,
    '',
    `They'll build their listing and send it for review. Admin: ${siteUrl()}/admin/collections/vendors/${id}`,
  ])
}

const afterSignUp = (kind: AccountKind, next?: string) =>
  kind === 'vendor' ? '/vendors/dashboard?welcome=1' : safeNext(next, ACCOUNT.customer.home)

const MARKETPLACE_CLOSED = 'Sign-ups open with the Zenfest Marketplace, coming soon.'

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  try {
    // Accounts exist for the marketplace; while it is "coming soon" nobody new signs up.
    if (!FEATURES.marketplace) throw new UserError(MARKETPLACE_CLOSED)
    if (!EMAIL_LOGIN) throw new UserError(EMAIL_OFF)
    const kind = kindOf(input?.kind)
    const { collection } = ACCOUNT[kind]
    if (text(input.company, 100)) return { ok: false, error: 'Please try again.' }
    if (await rateLimited(`signup-${kind}`, 10, 60 * 60 * 1000)) {
      throw new UserError('Too many sign-ups from this connection. Please try again later.')
    }

    const email = text(input.email, 200).toLowerCase()
    const password = typeof input.password === 'string' ? input.password : ''
    if (!isEmail(email)) throw new UserError('Enter a valid email address.')
    if (password.length < PASSWORD_MIN || password.length > 128) {
      throw new UserError(`Choose a password of at least ${PASSWORD_MIN} characters.`)
    }
    const data = await checkSignUpFields(kind, input, email)

    // With email checks on, Payload emails the confirm-your-email link
    // (accountAuth.ts) and the account can't log in until it's clicked.
    const confirm = emailChecksOn()
    const payload = await getPayloadClient()
    const account = await payload.create({
      collection,
      data: { ...data, email, password, _verified: !confirm } as never,
      disableVerificationEmail: !confirm,
      overrideAccess: true,
    })
    await awardQuietly(payload, { kind: kind === 'vendor' ? 'v' : 'c', id: account.id, reason: 'joined', source: 'account' })

    if (kind === 'vendor') {
      await tellTeamAboutVendor(data, email, account.id, confirm ? 'email not confirmed yet' : 'email')
    }
    if (confirm) return { ok: true, checkEmail: email }

    const { token, exp } = await payload.login({ collection, data: { email, password } })
    if (token) await setSessionCookie(token, exp)
    return { ok: true, redirect: afterSignUp(kind, input.next) }
  } catch (err) {
    return fail(err)
  }
}

/**
 * Finishes a "Continue with Google" sign-up: the Google profile comes from the
 * signed `zf_google_pending` cookie set by /auth/google/callback, the rest from
 * the form. Google confirmed the email, so the account is confirmed too; its
 * password is random (they can set one later with "Forgot password").
 */
export async function completeGoogleSignUp(
  input: Omit<SignUpInput, 'kind' | 'email' | 'password'>,
): Promise<AuthResult> {
  try {
    // Accounts exist for the marketplace; while it is "coming soon" nobody new signs up.
    if (!FEATURES.marketplace) throw new UserError(MARKETPLACE_CLOSED)
    if (!googleEnabled()) throw new UserError(EMAIL_OFF)
    const jar = await cookies()
    const pending = openCookie<PendingGoogle>(jar.get(PENDING_COOKIE)?.value)
    if (!pending) throw new UserError('Your Google sign-in timed out. Please choose “Continue with Google” again.')
    const kind = kindOf(pending.k)
    const { collection } = ACCOUNT[kind]
    const data = await checkSignUpFields(kind, input, pending.email)

    const payload = await getPayloadClient()
    const account = await payload.create({
      collection,
      data: {
        ...data,
        email: pending.email,
        password: randomBytes(24).toString('base64url'),
        googleId: pending.sub,
        _verified: true,
      } as never,
      disableVerificationEmail: true,
      overrideAccess: true,
    })
    jar.delete(PENDING_COOKIE)
    await awardQuietly(payload, { kind: kind === 'vendor' ? 'v' : 'c', id: account.id, reason: 'joined', source: 'account' })
    await startSession(collection, account.id)

    if (kind === 'vendor') await tellTeamAboutVendor(data, pending.email, account.id, 'Google')
    return { ok: true, redirect: afterSignUp(kind, pending.n) }
  } catch (err) {
    return fail(err)
  }
}

/** Always answers the same, so the form can't be used to find out who has an account. */
export async function resendVerification(input: { kind: AccountKind; email: string }) {
  const kind = kindOf(input?.kind)
  const email = text(input?.email, 200).toLowerCase()
  if (!isEmail(email)) return { ok: false as const, error: 'Enter a valid email address.' }
  if (await rateLimited('resend-verify', 6, 60 * 60 * 1000)) {
    return { ok: false as const, error: 'Too many requests. Please try again later.' }
  }
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: ACCOUNT[kind].collection,
      where: { and: [{ email: { equals: email } }, { _verified: { not_equals: true } }] },
      limit: 1,
      overrideAccess: true,
      showHiddenFields: true,
    })
    const account = docs[0] as { name?: string; email: string; _verificationToken?: string | null } | undefined
    if (account?._verificationToken) {
      await payload.sendEmail({
        to: account.email,
        subject: VERIFY_SUBJECT,
        html: verifyEmailHTML(ACCOUNT[kind].verify, account._verificationToken, account),
      })
    }
  } catch (err) {
    console.warn('[resendVerification]', err instanceof Error ? err.message : err)
  }
  return { ok: true as const }
}

export async function logIn(input: {
  kind: AccountKind
  email: string
  password: string
  next?: string
}): Promise<AuthResult> {
  const kind = kindOf(input?.kind)
  const { collection, home } = ACCOUNT[kind]
  try {
    if (!EMAIL_LOGIN) throw new UserError(EMAIL_OFF)
    if (await rateLimited('login', 20, 15 * 60 * 1000)) {
      throw new UserError('Too many attempts from this connection. Please wait a few minutes.')
    }
    const email = text(input.email, 200).toLowerCase()
    const password = typeof input.password === 'string' ? input.password : ''
    if (!isEmail(email) || !password) throw new UserError('Enter your email and password.')
    const payload = await getPayloadClient()
    let result
    try {
      result = await payload.login({ collection, data: { email, password } })
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'LockedAuth') {
        throw new UserError('Too many wrong passwords. Try again in 10 minutes, or reset your password.')
      }
      if (name === 'UnverifiedEmail') {
        return {
          ok: false,
          unverified: true,
          error: 'Please confirm your email first — open the link we emailed you when you signed up.',
        }
      }
      throw new UserError(
        kind === 'vendor'
          ? 'That email and password don’t match a vendor account.'
          : 'That email and password don’t match an account.',
      )
    }
    if (!result.token) throw new UserError('Could not log you in. Please try again.')
    await setSessionCookie(result.token, result.exp)
    return { ok: true, redirect: safeNext(input.next, home) }
  } catch (err) {
    return fail(err)
  }
}

export async function logOut(formData?: FormData) {
  await clearSessionCookie()
  redirect(safeNext(formData?.get('next'), '/'))
}

/** Always answers the same, so the form can't be used to find out who has an account. */
export async function forgotPassword(input: { kind: AccountKind; email: string }) {
  if (!EMAIL_LOGIN) return { ok: false as const, error: EMAIL_OFF }
  const kind = kindOf(input?.kind)
  const email = text(input?.email, 200).toLowerCase()
  if (!isEmail(email)) return { ok: false as const, error: 'Enter a valid email address.' }
  if (await rateLimited('forgot', 6, 60 * 60 * 1000)) {
    return { ok: false as const, error: 'Too many requests. Please try again later.' }
  }
  try {
    const payload = await getPayloadClient()
    await payload.forgotPassword({ collection: ACCOUNT[kind].collection, data: { email } })
  } catch (err) {
    console.warn('[forgotPassword]', err instanceof Error ? err.message : err)
  }
  return { ok: true as const }
}

export async function resetPassword(input: {
  kind: AccountKind
  token: string
  password: string
}): Promise<AuthResult> {
  const kind = kindOf(input?.kind)
  const { collection, home } = ACCOUNT[kind]
  try {
    if (!EMAIL_LOGIN) throw new UserError(EMAIL_OFF)
    const password = typeof input.password === 'string' ? input.password : ''
    if (password.length < PASSWORD_MIN || password.length > 128) {
      throw new UserError(`Choose a password of at least ${PASSWORD_MIN} characters.`)
    }
    const payload = await getPayloadClient()
    let result
    try {
      result = await payload.resetPassword({
        collection,
        data: { token: text(input.token, 200), password },
        overrideAccess: true,
      })
    } catch {
      throw new UserError('This reset link has expired or was already used. Ask for a new one.')
    }
    if (result.token) await setSessionCookie(result.token, Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30)
    return { ok: true, redirect: home }
  } catch (err) {
    return fail(err)
  }
}

// ---------- WhatsApp-number accounts (EMAIL_LOGIN off) ----------

const WHATSAPP_DOWN = 'WhatsApp verification is not available right now. Please WhatsApp us and we will set up your account.'

/** Sign up with name + WhatsApp number (+ business details for vendors); no email or password. */
export async function signUpWithWhatsApp(input: SignUpDetails & { kind: AccountKind }): Promise<AuthResult> {
  try {
    const kind = kindOf(input?.kind)
    if (text(input.company, 100)) return { ok: false, error: 'Please try again.' }
    // Accounts exist for the marketplace; while it is "coming soon" nobody new signs up.
    if (!FEATURES.marketplace) throw new UserError(MARKETPLACE_CLOSED)
    if (verifyMode() === 'off') throw new UserError(WHATSAPP_DOWN)
    if (await rateLimited(`signup-${kind}`, 10, 60 * 60 * 1000)) {
      throw new UserError('Too many sign-ups from this connection. Please try again later.')
    }
    const payload = await getPayloadClient()
    const { id, data } = await createWhatsAppAccount(payload, kind, input)
    await startSession(ACCOUNT[kind].collection, id)
    if (kind === 'vendor') await tellTeamAboutVendor(data, '—', id, 'WhatsApp')
    return { ok: true, redirect: afterSignUp(kind, input.next) }
  } catch (err) {
    return fail(err)
  }
}

/** Log in by proving the number on WhatsApp. */
export async function logInWithWhatsApp(input: {
  kind: AccountKind
  phone: string
  phoneProof?: SignUpDetails['phoneProof']
  next?: string
}): Promise<AuthResult> {
  const kind = kindOf(input?.kind)
  try {
    if (verifyMode() === 'off') throw new UserError(WHATSAPP_DOWN)
    if (await rateLimited('login', 20, 15 * 60 * 1000)) {
      throw new UserError('Too many attempts from this connection. Please wait a few minutes.')
    }
    const payload = await getPayloadClient()
    const id = await whatsAppLoginAccount(payload, kind, input.phone, input.phoneProof)
    await startSession(ACCOUNT[kind].collection, id)
    return { ok: true, redirect: safeNext(input.next, ACCOUNT[kind].home) }
  } catch (err) {
    return fail(err)
  }
}

/** The logged-in vendor / couple moves to a new WhatsApp number (verified first). */
export async function changeMyPhone(input: {
  kind: AccountKind
  phone: string
  phoneProof?: SignUpDetails['phoneProof']
}): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  try {
    const kind = kindOf(input?.kind)
    if (verifyMode() === 'off') throw new UserError(WHATSAPP_DOWN)
    const account = kind === 'vendor' ? await getVendor() : await getCustomer()
    if (!account) throw new UserError('Please log in again.')
    const payload = await getPayloadClient()
    const phone = await changeAccountPhone(payload, kind, account.id, input.phone, input.phoneProof)
    return { ok: true, phone }
  } catch (err) {
    return fail(err)
  }
}
