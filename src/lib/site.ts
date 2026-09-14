/**
 * Client-safe site helpers and types. IMPORTANT: this module must NOT import
 * anything server-only (e.g. the Payload client) because it is used by client
 * components. Server-side settings loading lives in ./getSettings.ts.
 */

/** Shape we rely on from the SiteSettings global (loosely typed for the UI). */
export type SiteSettings = {
  hero?: { headline?: string; subheadline?: string }
  contact?: {
    phonePrimary?: string
    phoneSecondary?: string
    whatsapp?: string
    email?: string
    hours?: string
  }
  branches?: {
    id?: string
    name?: string
    addressLine?: string
    phone?: string
    mapUrl?: string
  }[]
  social?: { instagram?: string; facebook?: string; youtube?: string }
}

/** Sensible fallbacks so the site looks complete before settings are filled in. */
export const SITE_FALLBACK: Required<SiteSettings> = {
  hero: {
    headline: 'Every celebration, beautifully managed',
    subheadline:
      'Weddings, birthdays, corporate functions and more across Chennai — décor, catering, photography, DJ and complete packages, handled end to end.',
  },
  contact: {
    phonePrimary: '+91 90800 89530',
    phoneSecondary: '',
    // wa.me needs the full international form, digits only.
    whatsapp: '919080089530',
    email: 'zenfestevents@gmail.com',
    hours: 'Mon–Sun, 9am–8pm',
  },
  branches: [
    {
      name: 'Guduvancheri',
      addressLine: 'GST Road corridor, Guduvancheri',
      phone: '+91 90800 89530',
      mapUrl: 'https://share.google/k8Hao1mw5sY2I1Xrk',
    },
    {
      name: 'Thiruverkadu',
      addressLine: 'Thiruverkadu, Chennai',
      phone: '+91 90800 89530',
      mapUrl: 'https://share.google/wsQlBEhpbRxSq8WpR',
    },
  ],
  social: { instagram: '', facebook: '', youtube: '' },
}

/** Build a wa.me deep link with a pre-filled message. */
export function whatsappLink(number?: string, message?: string): string {
  const digits = (number || '').replace(/[^\d]/g, '')
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/'
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export function telLink(number?: string): string {
  return `tel:${(number || '').replace(/\s+/g, '')}`
}

export const DEFAULT_WA_MESSAGE =
  "Hi Zenfest Events, I'd like to enquire about planning an event."
