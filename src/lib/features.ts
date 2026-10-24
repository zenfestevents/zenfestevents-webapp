// Client-safe: which features are open to the public. Off = the code stays, the
// pages show a "Coming soon" screen (polls: 404) and every link to them is hidden
// or marked "Soon". Flip a flag to true to bring the feature back as it was.
export const FEATURES = {
  /** Zenfest AI planner (/plan, bubble, homepage band). Also needs AI_API_KEY + Site Settings. */
  ai: false,
  /** Vendor marketplace (/marketplace/*) and the vendor/couple sign-ups that feed it. */
  marketplace: true,
  /** "Earn from events" hosts programme (/earn). */
  earn: false,
  /** Public polls (/polls/*, homepage band) and the registry's family polls tabs. */
  polls: false,
  /** Zenfest Shop (/shop, /shop/[occasion]): hidden from the nav, footer and registry.
   *  Product pages and /shop/policies stay up, since registry gifts link to them. */
  shop: false,
  /** Packages (/packages): "Coming soon" with a custom-quote CTA until the real packages
   *  are entered in the admin; nav and footer mark it "Soon". */
  packages: false,
} as const

/**
 * Whether the public sees what's still being built: the phone menu's "Coming soon" group,
 * the footer's "· soon" links and the homepage's "More ways to celebrate" band. Off by the
 * owner's choice (2026-10-22) — announce features when they launch. The features' own
 * pages still show "Coming soon" if someone has the URL.
 */
export const ANNOUNCE_COMING_SOON = false

/**
 * Where "For vendors" links go. While the marketplace is closed there is only one way to
 * join, so vendors go straight to the partner application instead of a choice whose second
 * half is "Coming soon" (owner, 2026-10-22). With the marketplace on, /vendors offers both.
 */
export const VENDORS_HREF = FEATURES.marketplace ? '/vendors' : '/vendors/partner'

/** The features shown as "Coming soon" while switched off, in menu order. */
export const COMING_SOON = [
  {
    key: 'ai',
    href: '/plan',
    label: 'Zenfest AI',
    title: 'Plan your whole event with Zenfest AI',
    body: 'An AI planner with a specialist for décor, catering, photography and more — drafting your plan with real price ranges.',
  },
  {
    key: 'marketplace',
    href: '/marketplace',
    label: 'Marketplace',
    title: 'Book vendors directly',
    body: 'Compare photographers, makeup artists, decorators, caterers and halls near you, with real prices upfront.',
  },
  {
    key: 'earn',
    href: '/earn',
    label: 'Earn from events',
    title: 'Earn from your event',
    body: 'Welcome a few travellers from abroad to your wedding or family function in Tamil Nadu, and earn from it.',
  },
] as const

export type ComingSoonKey = (typeof COMING_SOON)[number]['key']

export const comingSoon = (key: ComingSoonKey) => COMING_SOON.find((f) => f.key === key)!
