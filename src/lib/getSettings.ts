import { getPayloadClient } from './payload'
import { SITE_FALLBACK, type SiteSettings } from './site'

/** Keep a stored value only when it actually has something in it. */
const pick = <T>(stored: T | undefined | null, fallback: T): T => {
  if (stored === undefined || stored === null) return fallback
  if (typeof stored === 'string' && stored.trim() === '') return fallback
  return stored
}

/**
 * Fill blanks from SITE_FALLBACK. Components read `settings.contact.whatsapp`
 * directly, so an empty stored value silently hides the WhatsApp buttons —
 * merging here means a half-filled global degrades to sensible defaults instead.
 * Anything entered in the admin still wins.
 */
function withFallback(data: SiteSettings): SiteSettings {
  return {
    ...data,
    hero: {
      headline: pick(data.hero?.headline, SITE_FALLBACK.hero.headline),
      subheadline: pick(data.hero?.subheadline, SITE_FALLBACK.hero.subheadline),
    },
    contact: {
      phonePrimary: pick(data.contact?.phonePrimary, SITE_FALLBACK.contact.phonePrimary),
      phoneSecondary: data.contact?.phoneSecondary || '',
      whatsapp: pick(data.contact?.whatsapp, SITE_FALLBACK.contact.whatsapp),
      email: pick(data.contact?.email, SITE_FALLBACK.contact.email),
      hours: pick(data.contact?.hours, SITE_FALLBACK.contact.hours),
    },
    branches: data.branches?.length ? data.branches : SITE_FALLBACK.branches,
    social: data.social ?? SITE_FALLBACK.social,
  }
}

/** Server-only: load the SiteSettings global (falls back to defaults on error). */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const payload = await getPayloadClient()
    const data = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSettings
    return withFallback(data || {})
  } catch {
    return withFallback({})
  }
}
