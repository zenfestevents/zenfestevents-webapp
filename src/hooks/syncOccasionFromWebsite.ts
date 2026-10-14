import type { CollectionAfterChangeHook } from 'payload'

import type { Lead, Signup } from '../payload-types'
import { getReminderSettings, upsertWebsiteContact } from '../lib/occasions/server'

type Occasion = Parameters<typeof upsertWebsiteContact>[2]['occasions'][number]

/** The yearly occasion behind a website event type (sports events don't recur for a family). */
function eventOccasion(eventType: string | null | undefined, eventDate: string | null | undefined, withUs: boolean): Occasion | null {
  if (!eventDate) return null
  const base = { date: eventDate, eventWithUs: withUs, active: true }
  switch (eventType) {
    case 'wedding':
      return { ...base, type: 'wedding_anniversary', yearKnown: true }
    case 'housewarming':
      return { ...base, type: 'housewarming_anniversary', yearKnown: true }
    case 'corporate':
      return { ...base, type: 'corporate_annual', yearKnown: true }
    case 'birthday':
      // The party date, not the birth date — and we don't know whose — so no "Nth".
      return { ...base, type: 'birthday', yearKnown: false }
    case 'other':
      return { ...base, type: 'other', label: 'event anniversary', yearKnown: true }
    default:
      return null
  }
}

/**
 * Website enquiries become (unverified) occasion contacts — only when Reminder
 * Settings → "Add website enquiries…" is on. A lead marked Booked turns its
 * contact into a client. Never blocks the enquiry itself.
 */
export const syncLeadToContacts: CollectionAfterChangeHook<Lead> = async ({ doc, previousDoc, operation, req, context }) => {
  // Leads made from a reminder already belong to a contact (and their occasion).
  if (context?.fromReminder || doc.source === 'occasion-reminder') return doc
  const nowBooked = doc.status === 'booked' && previousDoc?.status !== 'booked'
  if (operation !== 'create' && !nowBooked) return doc
  try {
    if (!(await getReminderSettings(req.payload, req)).ingestWebsite) return doc
    const occasion = eventOccasion(doc.eventType, doc.eventDate, doc.status === 'booked')
    await upsertWebsiteContact(req.payload, req, {
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      source: 'website_lead',
      relationship: doc.status === 'booked' ? 'client' : 'lead',
      occasions: occasion ? [occasion] : [],
      websiteLead: doc.id,
    })
  } catch (err) {
    req.payload.logger.warn(`[occasions] Lead ${doc.id} not added to contacts: ${err instanceof Error ? err.message : String(err)}`)
  }
  return doc
}

/** Sign-ups give a birthday (and maybe an upcoming event) — same rules as above. */
export const syncSignupToContacts: CollectionAfterChangeHook<Signup> = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  try {
    if (!(await getReminderSettings(req.payload, req)).ingestWebsite) return doc
    const occasions: Occasion[] = [{ type: 'birthday', date: doc.birthday, yearKnown: true, active: true }]
    const event = doc.planningEvent === 'yes' ? eventOccasion(doc.eventType, doc.eventDate, false) : null
    if (event) occasions.push(event)
    await upsertWebsiteContact(req.payload, req, {
      name: doc.name,
      phone: doc.phone,
      source: 'website_signup',
      relationship: 'lead',
      occasions,
      websiteSignup: doc.id,
    })
  } catch (err) {
    req.payload.logger.warn(`[occasions] Sign-up ${doc.id} not added to contacts: ${err instanceof Error ? err.message : String(err)}`)
  }
  return doc
}
