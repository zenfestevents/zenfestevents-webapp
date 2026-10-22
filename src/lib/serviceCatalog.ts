// Every service Zenfest works with, grouped — the owner's list (2026-10-14, from five
// years in events). One catalogue so vendor forms and, later, the marketplace use the
// same names. Client-safe: no server imports (see the client/server note in CLAUDE.md).
//
// "What you offer" on the partner form (/vendors/partner) lists every service, grouped;
// only `vendor: 'on'` ones can be picked, the rest show greyed out ("coming soon").
// Services are switched on one at a time. To switch one on:
//   1. set `vendor: 'on'` here;
//   2. add its id to the `vendorType` options in collections/VendorApplications.ts, then
//      `npm run generate:types` and `npm run migrate:create` (it's a Postgres enum);
//   3. give it questions in VendorForm. Photography and Bakers have their own; the first
//      other service also needs the common "your services & prices" section built once
//      (items with name, what's included, starting price and unit).
// The marketplace categories (lib/marketplaceOptions.ts) should move onto this list when
// the marketplace launches.

export const SERVICE_GROUPS = [
  { id: 'main', label: 'Main Services' },
  { id: 'bride-groom', label: 'Bride & Groom' },
  { id: 'traditions', label: 'Traditions & Rituals' },
  { id: 'cakes-gifts', label: 'Cakes, Gifts & Invites' },
  { id: 'entries-effects', label: 'Grand Entries & Effects' },
  { id: 'entertainment', label: 'Music & Entertainment' },
  { id: 'photo-fun', label: 'Photo Fun & Memories' },
  { id: 'guest-stations', label: 'Guest Stations & Artists' },
  { id: 'kids', label: "Kids' Zone & Games" },
  { id: 'staff', label: 'Event Staff' },
] as const

export type ServiceGroupId = (typeof SERVICE_GROUPS)[number]['id']

export type Service = {
  /** Stable id. `photography` and `cake` match vendor-applications.vendorType. */
  id: string
  name: string
  group: ServiceGroupId
  /** Offered on the partner vendor form. */
  vendor: 'on' | 'off'
}

export const SERVICES: readonly Service[] = [
  // Main Services
  { id: 'photography', name: 'Photography & Videography', group: 'main', vendor: 'on' },
  { id: 'catering', name: 'Catering (Food, Food Stall & Service)', group: 'main', vendor: 'off' },
  { id: 'decoration', name: 'Decoration', group: 'main', vendor: 'off' },
  { id: 'venue', name: 'Event Venue', group: 'main', vendor: 'off' },
  // Bride & Groom
  { id: 'makeup', name: 'Makeup', group: 'bride-groom', vendor: 'off' },
  { id: 'mehendi', name: 'Mehendi', group: 'bride-groom', vendor: 'off' },
  { id: 'dress-jewellery-rental', name: 'Dress & Jewellery Rental', group: 'bride-groom', vendor: 'off' },
  // Traditions & Rituals
  { id: 'iyer-mangala-vadyam', name: 'Iyer & Mangala Vadyam', group: 'traditions', vendor: 'off' },
  { id: 'garland', name: 'Garland & Flowers', group: 'traditions', vendor: 'off' },
  // Cakes, Gifts & Invites
  { id: 'cake', name: 'Home Cake (Bakers)', group: 'cakes-gifts', vendor: 'on' },
  { id: 'return-gift', name: 'Return Gift', group: 'cakes-gifts', vendor: 'off' },
  { id: 'invitation', name: 'Invitation & E-Invite', group: 'cakes-gifts', vendor: 'off' },
  // Grand Entries & Effects
  { id: 'entry', name: 'Entry (Couple, Birthday…)', group: 'entries-effects', vendor: 'off' },
  { id: 'cold-pyro', name: 'Cold Pyro', group: 'entries-effects', vendor: 'off' },
  { id: 'smoke-machine', name: 'Smoke Machine', group: 'entries-effects', vendor: 'off' },
  { id: 'smoke-pot', name: 'Smoke Pot', group: 'entries-effects', vendor: 'off' },
  // Music & Entertainment
  { id: 'dj', name: 'DJ (Normal & Honeycomb)', group: 'entertainment', vendor: 'off' },
  { id: 'live-music', name: 'Live Music & Band', group: 'entertainment', vendor: 'off' },
  { id: 'sound-systems', name: 'Sound Systems', group: 'entertainment', vendor: 'off' },
  { id: 'dance-performance', name: 'Dance Performance', group: 'entertainment', vendor: 'off' },
  { id: 'magic-show', name: 'Magic Show', group: 'entertainment', vendor: 'off' },
  { id: 'bubble-show', name: 'Bubble Show', group: 'entertainment', vendor: 'off' },
  // Photo Fun & Memories
  { id: 'insta-360', name: 'Insta 360', group: 'photo-fun', vendor: 'off' },
  { id: 'photobooth', name: 'Mirror / Photobooth', group: 'photo-fun', vendor: 'off' },
  { id: 'vintage-photobooth', name: 'Vintage Photobooth', group: 'photo-fun', vendor: 'off' },
  { id: 'wishes-box', name: 'Wishes Box', group: 'photo-fun', vendor: 'off' },
  { id: 'portrait', name: 'Portrait', group: 'photo-fun', vendor: 'off' },
  { id: 'caricature', name: 'Caricature', group: 'photo-fun', vendor: 'off' },
  // Guest Stations & Artists
  { id: 'nail-art', name: 'Nail Art', group: 'guest-stations', vendor: 'off' },
  { id: 'tattoo', name: 'Tattoo', group: 'guest-stations', vendor: 'off' },
  { id: 'jewellery-station', name: 'Jewellery Station', group: 'guest-stations', vendor: 'off' },
  { id: 'sunglass-station', name: 'Sunglass Station', group: 'guest-stations', vendor: 'off' },
  { id: 'bangle-station', name: 'Bangle Station', group: 'guest-stations', vendor: 'off' },
  { id: 'glass-calligraphy', name: 'Glass Calligraphy', group: 'guest-stations', vendor: 'off' },
  { id: 'potli-bag-station', name: 'Potli Bag Station', group: 'guest-stations', vendor: 'off' },
  { id: 'balloon-sculpture', name: 'Balloon Sculpture', group: 'guest-stations', vendor: 'off' },
  // Kids' Zone & Games
  { id: 'jumping-castle', name: 'Jumping Castle', group: 'kids', vendor: 'off' },
  { id: 'mini-trampoline', name: 'Mini Trampoline', group: 'kids', vendor: 'off' },
  { id: 'merry-go-round', name: 'Merry-go-round', group: 'kids', vendor: 'off' },
  { id: 'balloon-shooting', name: 'Balloon Shooting', group: 'kids', vendor: 'off' },
  // Event Staff
  { id: 'welcome-girl', name: 'Welcome Girl', group: 'staff', vendor: 'off' },
  { id: 'managers', name: 'Managers (Manpower)', group: 'staff', vendor: 'off' },
]

/** Every service grouped in catalogue order, for an <optgroup> dropdown (`vendor` says which can be picked). */
export function servicesByGroup() {
  return SERVICE_GROUPS.map((g) => ({
    label: g.label,
    services: SERVICES.filter((s) => s.group === g.id),
  }))
}

export function serviceName(id: unknown) {
  return SERVICES.find((s) => s.id === id)?.name ?? ''
}
