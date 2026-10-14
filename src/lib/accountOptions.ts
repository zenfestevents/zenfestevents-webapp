// How vendors and couples sign up and log in. Client-safe.
//
// Owner's call (2026-10-14): accounts use the WhatsApp number only — sign up and
// log in by sending a code on WhatsApp, no email, no password, no Google. The
// email/password and Google code is kept, just switched off here; flip a switch
// to bring it back.

/** Email + password sign-up, login, "forgot password" and email confirmation. */
export const EMAIL_LOGIN = false

/** "Continue with Google" (also needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). */
export const GOOGLE_SIGNIN = false

/**
 * WhatsApp-only accounts still need an email for Payload's auth, so they get this
 * placeholder. `.invalid` is a reserved domain: nothing is ever delivered there,
 * and `sendMail` skips it.
 */
export const placeholderEmail = (phone: string) => `${phone}@whatsapp.invalid`

export const isPlaceholderEmail = (email: string | null | undefined) => Boolean(email?.endsWith('@whatsapp.invalid'))
