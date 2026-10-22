// Client-safe: which features are open to the public. Off = the code stays, the
// pages show a "Coming soon" screen (polls: 404) and every link to them is hidden
// or marked "Soon". Flip a flag to true to bring the feature back as it was.
export const FEATURES = {
  /** Zenfest AI planner (/plan, bubble, homepage band). Also needs AI_API_KEY + Site Settings. */
  ai: false,
  /** Vendor marketplace (/marketplace/*) and the vendor/couple sign-ups that feed it. */
  marketplace: false,
  /** "Earn from events" hosts programme (/earn). */
  earn: false,
  /** Public polls (/polls/*, homepage band) and the registry's family polls tabs. */
  polls: false,
  /** Zenfest Shop (/shop, /shop/[occasion]): hidden from the nav, footer and registry.
   *  Product pages and /shop/policies stay up, since registry gifts link to them. */
  shop: false,
} as const

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
