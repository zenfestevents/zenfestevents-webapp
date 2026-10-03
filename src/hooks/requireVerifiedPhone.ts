import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { consumePhoneProof, normalizePhone, verifyMode } from '../lib/phoneVerification'

/**
 * On create, requires the submission to carry `phoneVerification: { id, token }`
 * pointing at a verified, unexpired, unused PhoneVerifications record for the
 * same phone — then consumes it and sets `phoneVerified`. Skipped (flag left
 * false) while verification mode is "off". The client can't set `phoneVerified`
 * itself: it is always decided here.
 */
export const requireVerifiedPhone: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data
  // Only ever set from the session below, never from the request body.
  delete data.vendor

  // A logged-in marketplace vendor answering the questionnaire from their
  // dashboard: their account's phone (verified at sign-up) is used as-is.
  if (req.user?.collection === 'vendors') {
    const vendor = req.user as { id: number | string; phone?: string; phoneVerified?: boolean | null }
    delete data.phoneVerification
    data.vendor = vendor.id
    data.phone = vendor.phone
    data.phoneVerified = Boolean(vendor.phoneVerified)
    return data
  }

  const claim = data.phoneVerification as { id?: unknown; token?: unknown } | undefined
  delete data.phoneVerification
  data.phoneVerified = false
  if (verifyMode() === 'off') return data

  const fail = () => {
    throw new APIError('Verify your phone number on WhatsApp first.', 400, null, true)
  }
  const phone = normalizePhone(data.phone)
  if (!phone || !(await consumePhoneProof(req.payload, claim, phone, req))) return fail()

  data.phone = phone
  data.phoneVerified = true
  return data
}
