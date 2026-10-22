// Client-safe: the event labels a testimonial can carry (collections/Testimonials.ts).
// A select (Postgres enum), so adding one needs `npm run migrate:create`.
export const TESTIMONIAL_EVENTS = [
  ['wedding', 'Wedding'],
  ['engagement', 'Engagement'],
  ['birthday', 'Birthday'],
  ['babyshower', 'Baby shower'],
  ['puberty', 'Puberty function'],
  ['housewarming', 'Housewarming'],
  ['corporate', 'Corporate event'],
  ['opening', 'Shop opening'],
  ['sports', 'Sports event'],
  ['other', 'Other'],
] as const

export type TestimonialEvent = (typeof TESTIMONIAL_EVENTS)[number][0]

export const testimonialEventLabel = (v: unknown) => TESTIMONIAL_EVENTS.find(([k]) => k === v)?.[1] ?? ''
