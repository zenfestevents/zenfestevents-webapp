// Option lists shared by the host form (client) and the HostApplications
// collection (server). Keep this file free of server imports — see the
// client/server note in CLAUDE.md.
//
// These are Payload `select` options, which Postgres stores as enums: adding or
// renaming a value needs `npm run migrate:create` like any other schema change.

/** Functions a family can open to guests, as [value, label]. */
export const HOST_EVENT_TYPES = [
  ['wedding', 'Wedding'],
  ['engagement', 'Engagement / nichayathartham'],
  ['reception', 'Wedding reception'],
  ['valaikappu', 'Valaikappu / seemantham'],
  ['puberty', 'Puberty ceremony (manjal neerattu)'],
  ['naming', 'Naming ceremony'],
  ['ear-piercing', 'Ear-piercing (kaadhu kuthu)'],
  ['housewarming', 'Housewarming (griha pravesam)'],
  ['festival', 'Festival at home (Pongal, Deepavali…)'],
  ['other', 'Other'],
] as const

/**
 * Where we host today — Tamil Nadu only. Add a city here as the service area
 * grows (and run `migrate:create`, see above).
 */
export const HOST_CITIES = [
  ['chennai', 'Chennai'],
  ['coimbatore', 'Coimbatore'],
  ['madurai', 'Madurai'],
  ['tiruchirappalli', 'Tiruchirappalli'],
  ['salem', 'Salem'],
  ['tirunelveli', 'Tirunelveli'],
  ['vellore', 'Vellore'],
  ['thanjavur', 'Thanjavur'],
  ['erode', 'Erode'],
  ['tiruppur', 'Tiruppur'],
  ['kanchipuram', 'Kanchipuram'],
  ['other-tn', 'Other town in Tamil Nadu'],
] as const

export const HOST_DAYS = [
  ['1', '1 day'],
  ['2', '2 days'],
  ['3+', '3 days or more'],
] as const

export const HOST_LANGUAGES = [
  ['tamil', 'Tamil'],
  ['telugu', 'Telugu'],
  ['malayalam', 'Malayalam'],
  ['kannada', 'Kannada'],
  ['hindi', 'Hindi'],
  ['other', 'Other'],
] as const

export const HOST_RELATIONS = [
  ['couple', 'Bride / groom'],
  ['parent', 'Parent'],
  ['sibling', 'Brother / sister'],
  ['relative', 'Other relative'],
  ['other', 'Other'],
] as const

/** How many foreign guests the family is happy to welcome. */
export const HOST_SEATS = [
  ['1-2', '1–2 guests'],
  ['3-5', '3–5 guests'],
  ['6+', '6 or more'],
] as const

/** What the family can offer guests beyond attending. */
export const HOST_EXPERIENCES = [
  ['meals', 'Meals with the family'],
  ['dress-up', 'Help dressing in saree / veshti'],
  ['mehendi', 'Mehendi'],
  ['buddy', 'A family member as guide'],
  ['photos', 'Photos with the family'],
  ['stay', 'Stay at or near the venue'],
] as const

export const YES_NO = [
  ['yes', 'Yes'],
  ['no', 'No'],
] as const

/** Payload `options` from a [value, label] list. */
export const toOptions = (list: readonly (readonly [string, string])[]) =>
  list.map(([value, label]) => ({ value, label }))
