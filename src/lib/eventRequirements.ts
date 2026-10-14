// Client-safe: the "Plan your event" form (/enquire) — a rebuild of the team's three
// Tally "Basic Details" forms (Wedding & Reception w4pMpk, Birthday waaAMX, Baby Shower
// nPGJKx). Shared by the form and by Leads' validation. Values are short readable
// names, stored as-is in `leads.requirements`, so the admin and the team email read
// plainly; labels add the Tally form's examples.

export type Option = readonly [value: string, label: string]

export const ENQUIRY_EVENTS = [
  ['wedding', 'Wedding & Reception'],
  ['birthday', 'Birthday'],
  ['babyshower', 'Baby Shower'],
] as const

export type EnquiryEvent = (typeof ENQUIRY_EVENTS)[number][0]

export const isEnquiryEvent = (v: unknown): v is EnquiryEvent => ENQUIRY_EVENTS.some(([e]) => e === v)

// Services shared by all three forms, worded as Tally words them.
const S = {
  food: ['Food', 'Food'],
  foodStall: ['Food stall', "Food Stall (Ice cream, Pani puri, Popcorn, 90's chocolate, Tea & Filter Coffee…)"],
  hall: ['Hall / Mandapam / Resort', 'Party Hall / Mandapam / Resorts'],
  decoration: ['Decoration', 'Decoration'],
  photography: ['Photography', 'Photography'],
  videography: ['Videography', 'Videography'],
  returnGift: ['Return gift', 'Return Gift'],
  garland: ['Garland', 'Garland'],
  makeup: ['Makeup', 'Makeup'],
  mehndi: ['Mehndi', 'Mehndi'],
  fingerprint: ['Fingerprint tree', 'Fingerprint Tree'],
  jewellery: ['Jewellery rental', 'Jewellery Rental'],
  welcomeGirl: ['Welcome girl', 'Welcome Girl'],
  dress: ['Dress rental', 'Dress Rental (Men, Women & Children)'],
  artistry: ['Artistry', 'Artistry (Nail Art, Tattoo Painting, Balloon Sculpture, Caricature…)'],
  bakery: ['Bakery & sweets', 'Bakery & Sweets (Cake, Puffs, Samosa, Cutlet, Gulab Jamun…)'],
  fun: ['Fun & entertainment', 'Fun & Entertainment (Balloon Shooting, Insta 360 Video, Mirror Booth…)'],
  invitation: ['Invitation & e-invite', 'Invitation & E-Invite'],
  performance: ['Performance', 'Performance (DJ, Magic Show, Chenda Melam, Live Band, Comedy Show…)'],
  rentals: ['Tables, chairs & tent', 'Table, Chair, Shamiana, Arabian Tent, Focus Lights, Fan…'],
} satisfies Record<string, Option>

const WEDDING_SERVICES: Option[] = [
  S.food,
  S.foodStall,
  S.hall,
  S.decoration,
  S.photography,
  S.videography,
  [
    'Couple entry',
    'Couple Entry (Heart-Joining, Floral Canopy Walk, Royal Carriage, Dancing, Bollywood Style, Bubble, Violin/Saxophone Serenade…)',
  ],
  S.returnGift,
  S.garland,
  ['Mangala vadyam', 'Mangala Vadyam (Melam, Nadhaswaram…)'],
  ['Makeup', 'Makeup (Bride, Groom & Guest)'],
  ['Mehndi', 'Mehndi (Bride, Groom & Guest)'],
  S.fingerprint,
  ['Jewellery rental', 'Jewellery & Ornaments Rental (Bride, Groom & Guest)'],
  S.welcomeGirl,
  S.dress,
  S.artistry,
  S.bakery,
  S.fun,
  S.invitation,
  S.performance,
  S.rentals,
]

const BIRTHDAY_SERVICES: Option[] = [
  S.food,
  S.hall,
  S.decoration,
  S.photography,
  S.videography,
  ['LED wall', 'LED Wall'],
  S.returnGift,
  S.makeup,
  S.mehndi,
  S.jewellery,
  S.welcomeGirl,
  S.dress,
  ['Artistry', 'Artistry (Mehndi, Nail Art, Tattoo Painting…)'],
  S.bakery,
  S.fun,
  S.invitation,
  ['Entry', 'Entry (Smoke, Pyro, Car Entry…)'],
  S.performance,
  S.rentals,
]

const BABYSHOWER_SERVICES: Option[] = [
  S.food,
  S.foodStall,
  S.hall,
  S.decoration,
  S.photography,
  S.videography,
  ['Indoor shoot', 'Indoor Shoot'],
  ['Outdoor shoot', 'Outdoor Shoot'],
  S.returnGift,
  S.garland,
  S.makeup,
  S.mehndi,
  S.fingerprint,
  S.jewellery,
  S.welcomeGirl,
  S.dress,
  S.artistry,
  S.bakery,
  S.fun,
  S.invitation,
  S.performance,
  S.rentals,
]

export const SERVICES_BY_EVENT: Record<EnquiryEvent, Option[]> = {
  wedding: WEDDING_SERVICES,
  birthday: BIRTHDAY_SERVICES,
  babyshower: BABYSHOWER_SERVICES,
}

/** Every service value any of the forms can send (for server-side validation). */
export const ALL_SERVICES = new Set(Object.values(SERVICES_BY_EVENT).flatMap((list) => list.map(([v]) => v)))

export const WEDDING_PARTS = [
  ['Reception & Wedding', 'Both (Reception & Wedding)'],
  ['Reception only', 'Only Reception'],
  ['Wedding only', 'Only Wedding'],
] as const satisfies readonly Option[]

export const hasReception = (part: string) => part === 'Reception & Wedding' || part === 'Reception only'
export const hasWedding = (part: string) => part === 'Reception & Wedding' || part === 'Wedding only'

export const EXTRA_SHOOTS = [
  ['Pre-wedding shoot', 'Pre-Wedding / Reception Shoot'],
  ['Post-wedding shoot', 'Post-Wedding / Reception Shoot'],
  ['Not needed', 'Not needed'],
] as const satisfies readonly Option[]

export const BIRTHDAY_CHILD = [
  ['Boy', 'Boy'],
  ['Girl', 'Girl'],
] as const satisfies readonly Option[]

export const TWINS_TYPES = [
  ['Girl Boy', 'Girl & Boy'],
  ['Boy Boy', 'Boy & Boy'],
  ['Girl Girl', 'Girl & Girl'],
] as const satisfies readonly Option[]

/** A 10-digit Indian mobile from what was typed (+91 / 0 prefixes and spaces allowed). */
export function tenDigitMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}
