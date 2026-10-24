// Server-only: WhatsApp-number accounts (see lib/accountOptions.ts). Sign-up and
// login both rest on the WhatsApp "reverse" check — the person sends a code from
// their phone and Meta tells us the sender — so the proof from PhoneVerify is the
// password. These take the Payload client and return plain results; the Server
// Actions in lib/authActions.ts add the session cookie. Never import from a
// client component.
import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'

import { placeholderEmail } from './accountOptions'
import { signUpData, verifiedAccountsWithPhone, type SignUpDetails } from './accountSignup'
import { UserError } from './formCheck'
import { consumePhoneProof, normalizePhone } from './phoneVerification'
import { awardQuietly } from './rewards'
import { ACCOUNT, type AccountKind } from './session'

type Proof = SignUpDetails['phoneProof']

const NEED_PROOF = 'Verify your number on WhatsApp first.'

/** Creates the account; the WhatsApp proof is consumed last, after every other check. */
export async function createWhatsAppAccount(payload: Payload, kind: AccountKind, input: SignUpDetails) {
  const { data, phone } = await signUpData(kind, input)
  if ((await verifiedAccountsWithPhone(payload, kind, phone)).length) {
    throw new UserError('There is already an account with this WhatsApp number. Log in instead.')
  }
  if (!(await consumePhoneProof(payload, input.phoneProof, phone))) throw new UserError(NEED_PROOF)

  const account = await payload.create({
    collection: ACCOUNT[kind].collection,
    data: {
      ...data,
      phoneVerified: true,
      email: placeholderEmail(phone),
      // Never used: there is no password login while EMAIL_LOGIN is off.
      password: randomBytes(24).toString('base64url'),
      _verified: true,
    } as never,
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  // Runs club: welcome runs (once per account — the unique index makes a repeat a no-op).
  await awardQuietly(payload, { kind: kind === 'vendor' ? 'v' : 'c', id: account.id, reason: 'joined', source: 'account' })
  return { id: account.id, data }
}

/** The account a verified WhatsApp number opens. */
export async function whatsAppLoginAccount(payload: Payload, kind: AccountKind, rawPhone: unknown, proof: Proof) {
  const phone = normalizePhone(rawPhone)
  if (!phone) throw new UserError('Enter a valid 10-digit mobile number.')
  const [account] = await verifiedAccountsWithPhone(payload, kind, phone)
  if (!account) {
    throw new UserError(
      kind === 'vendor'
        ? 'No vendor account uses this WhatsApp number yet. Sign up first.'
        : 'No account uses this WhatsApp number yet. Sign up first.',
    )
  }
  if (!(await consumePhoneProof(payload, proof, phone))) throw new UserError(NEED_PROOF)
  return account.id
}

/** Moves an account to a new number, which must be verified and not used by another account. */
export async function changeAccountPhone(
  payload: Payload,
  kind: AccountKind,
  accountId: number | string,
  rawPhone: unknown,
  proof: Proof,
) {
  const phone = normalizePhone(rawPhone)
  if (!phone) throw new UserError('Enter a valid 10-digit mobile number.')
  const others = (await verifiedAccountsWithPhone(payload, kind, phone)).filter((a) => a.id !== accountId)
  if (others.length) throw new UserError('Another account already uses this WhatsApp number.')
  if (!(await consumePhoneProof(payload, proof, phone))) throw new UserError(NEED_PROOF)
  await payload.update({
    collection: ACCOUNT[kind].collection,
    id: accountId,
    data: { phone, phoneVerified: true },
    overrideAccess: true,
  })
  return phone
}
