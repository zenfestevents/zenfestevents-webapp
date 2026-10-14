// Client-safe option lists for occasion reminders (contacts, reminders, settings,
// the admin widget and the import script all share these). They are Postgres
// enums, so adding a value needs `npm run migrate:create`.

export const OCCASION_TYPES = [
  { value: 'birthday', label: 'Birthday (adult)' },
  { value: 'kid_birthday', label: "Child's birthday" },
  { value: 'wedding_anniversary', label: 'Wedding anniversary' },
  { value: 'engagement_anniversary', label: 'Engagement anniversary' },
  { value: 'housewarming_anniversary', label: 'Housewarming anniversary' },
  { value: 'corporate_annual', label: 'Corporate / annual day' },
  { value: 'other', label: 'Other yearly occasion' },
] as const

export type OccasionType = (typeof OCCASION_TYPES)[number]['value']

/** Days before the date that the reminder task is created (overridable in Reminder Settings). */
export const DEFAULT_LEAD_DAYS: Record<OccasionType, number> = {
  birthday: 10,
  kid_birthday: 14,
  wedding_anniversary: 14,
  engagement_anniversary: 14,
  housewarming_anniversary: 14,
  corporate_annual: 30,
  other: 14,
}

export const RELATIONSHIPS = [
  { value: 'client', label: 'Client (did an event with us)' },
  { value: 'lead', label: 'Lead (enquired, not converted)' },
  { value: 'cold', label: 'Cold (cold call / referral)' },
] as const

export type Relationship = (typeof RELATIONSHIPS)[number]['value']

/** Website sources are self-typed by visitors, so they start unverified. */
export const CONTACT_SOURCES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone_call', label: 'Phone call' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'past_event_import', label: 'Past event list (import)' },
  { value: 'website_lead', label: 'Website enquiry' },
  { value: 'website_signup', label: 'Website sign-up' },
] as const

export type ContactSource = (typeof CONTACT_SOURCES)[number]['value']

export const WEBSITE_SOURCES: ContactSource[] = ['website_lead', 'website_signup']

export const REMINDER_STATUSES = [
  { value: 'pending', label: 'To send' },
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'interested', label: 'Interested' },
  { value: 'booked', label: 'Booked' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'missed', label: 'Missed (date passed)' },
  { value: 'opted_out', label: 'Asked not to be contacted' },
] as const

export type ReminderStatus = (typeof REMINDER_STATUSES)[number]['value']

export const REMINDER_CHANNELS = [
  { value: 'wa_manual', label: 'WhatsApp (sent by staff)' },
  { value: 'wa_api', label: 'WhatsApp (automatic)' },
  { value: 'call', label: 'Phone call' },
] as const

export const BRANCHES = [
  { value: 'guduvancheri', label: 'Guduvancheri' },
  { value: 'thiruverkadu', label: 'Thiruverkadu' },
  { value: 'any', label: 'No preference' },
] as const

export function occasionLabel(type: string | null | undefined): string {
  return OCCASION_TYPES.find((t) => t.value === type)?.label ?? 'Occasion'
}

export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

/**
 * The words used in the message: "1st wedding anniversary", "5th birthday",
 * "birthday". Adult birthdays never show the age, even when the year is known.
 */
export function milestone(type: string | null | undefined, nth: number | null, customLabel?: string | null): string {
  const n = nth && nth > 0 ? `${ordinal(nth)} ` : ''
  switch (type) {
    case 'birthday':
      return 'birthday'
    case 'kid_birthday':
      return `${n}birthday`
    case 'wedding_anniversary':
      return `${n}wedding anniversary`
    case 'engagement_anniversary':
      return `${n}engagement anniversary`
    case 'housewarming_anniversary':
      return `${n}housewarming anniversary`
    case 'corporate_annual':
      return `${n}${customLabel?.trim() || 'annual day'}`
    default:
      return `${n}${customLabel?.trim() || 'special day'}`
  }
}
