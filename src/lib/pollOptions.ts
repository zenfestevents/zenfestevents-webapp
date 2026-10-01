// Poll categories and the Zenfest call-to-action shown after a vote. Client-safe:
// shared by poll components and the Polls collection (see CLAUDE.md).
//
// Categories are Postgres enums: adding one needs `npm run migrate:create`.

export { toOptions } from './hostOptions'

export const POLL_CATEGORIES = [
  ['sports', 'Sports'],
  ['entertainment', 'Entertainment'],
  ['food', 'Food'],
  ['lifestyle', 'Lifestyle'],
  ['politics', 'Politics'],
  ['civic', 'Civic'],
  ['event', 'Event'],
] as const

export type PollCategory = (typeof POLL_CATEGORIES)[number][0]

/**
 * After someone votes, nudge them toward a Zenfest service that fits the poll.
 * A poll's own CTA (set in the admin) overrides these.
 */
export const CATEGORY_CTA: Record<PollCategory, { text: string; label: string; href: string }> = {
  sports: {
    text: 'Corporate sports day, tournament or a big-screen match night? Zenfest runs the whole thing.',
    label: 'Plan a sports event',
    href: '/contact',
  },
  entertainment: {
    text: 'Want a DJ, live band or a star-studded stage for your celebration? We bring the show.',
    label: 'Book entertainment',
    href: '/services',
  },
  food: {
    text: 'From filter coffee counters to full wedding feasts — Zenfest handles catering for every function.',
    label: 'Get a catering quote',
    href: '/contact',
  },
  lifestyle: {
    text: 'Planning a wedding, birthday or housewarming? Zenfest plans, styles and runs it end to end.',
    label: 'Plan my celebration',
    href: '/contact',
  },
  politics: {
    text: 'Rallies, meetings and public functions — Zenfest manages stage, sound, seating and crowds.',
    label: 'Talk to our team',
    href: '/contact',
  },
  civic: {
    text: 'Community festivals, residents’ association events and awareness drives — we organise them.',
    label: 'Plan a community event',
    href: '/contact',
  },
  event: {
    text: 'Planning your own celebration? Make a free gift registry and let Zenfest handle the rest.',
    label: 'Create a registry',
    href: '/registry',
  },
}

export const RESULTS_VISIBILITY = [
  ['after-vote', 'After the person votes'],
  ['always', 'Always'],
  ['after-close', 'Only after the poll closes'],
] as const

/** Poll addresses: same rule as registry slugs, up to 80 chars. */
export const POLL_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,79}$/
