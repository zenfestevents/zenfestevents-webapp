// Option lists shared by the vendor form (client), the VendorApplications
// collection and the Airtable sync (server). Keep this file free of server
// imports — see the client/server note in CLAUDE.md.

/** The five photo & video services, as [value, label]. */
export const PHOTO_SERVICES = [
  ['traditional-photo', 'Traditional photo'],
  ['traditional-video', 'Traditional video'],
  ['candid-photo', 'Candid photo'],
  ['candid-video', 'Candid video'],
  ['drone', 'Drone'],
] as const

/** Plain-words list of the services, for form copy. */
export const PHOTO_SERVICES_SUMMARY = 'Traditional photo & video, Candid photo & video, and Drone'

export type PhotoService = (typeof PHOTO_SERVICES)[number][0]

/** Album design / video editing, split by traditional and candid. */
export const PHOTO_EDITING = [
  ['album-traditional', 'Album design – traditional'],
  ['album-candid', 'Album design – candid'],
  ['video-traditional', 'Video editing – traditional'],
  ['video-candid', 'Video editing – candid'],
] as const

export type PhotoEditing = (typeof PHOTO_EDITING)[number][0]

/**
 * Which editing value a specialist's "yes" means, e.g. candid-photo → album-candid.
 * Drone has no album/editing question, so it maps to null.
 */
export function editingFor(service: PhotoService): PhotoEditing | null {
  if (service === 'drone') return null
  const [style, kind] = service.split('-') as ['traditional' | 'candid', 'photo' | 'video']
  return `${kind === 'photo' ? 'album' : 'video'}-${style}`
}

// ─── Cakes ── follows the "Approved 10" intake questions in the Cake Vendors
// Airtable base. Labels match that base's dropdown choices where one exists.

/** How an eggless / wheat surcharge is charged. */
export const SURCHARGE_UNITS = [
  ['per-kg', 'Per kg'],
  ['flat', 'Flat per cake'],
  ['nil', 'No extra charge'],
  ['none', "Don't offer it"],
] as const

/** How the 2 kg / 3 kg tier-cake charge is charged. */
export const TIER_UNITS = [
  ['flat', 'Flat per cake'],
  ['per-kg', 'Per kg'],
  ['none', "Don't make tier cakes"],
] as const

/** How the custom theme cake charge is charged. */
export const CUSTOM_UNITS = [
  ['per-cake', 'Per cake'],
  ['per-kg', 'Per kg'],
  ['none', "Don't make custom cakes"],
] as const

export const MIN_ORDERS = [
  ['half-kg', 'Half kg'],
  ['1kg', '1 kg'],
] as const

/** Bakers must list at least this many flavours with their per-kg rate. */
export const MIN_FLAVOURS = 3

export const toOptions = (list: readonly (readonly [string, string])[]) =>
  list.map(([value, label]) => ({ value, label }))

export function optionLabel(list: readonly (readonly [string, string])[], value: unknown) {
  return list.find(([v]) => v === value)?.[1] ?? ''
}

export function photoServiceLabel(value: string | null | undefined) {
  return PHOTO_SERVICES.find(([v]) => v === value)?.[1] ?? value ?? ''
}
