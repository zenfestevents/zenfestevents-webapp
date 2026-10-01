import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { notifySubmission } from '../hooks/notifySubmission'
import {
  HOST_CITIES,
  HOST_DAYS,
  HOST_EVENT_TYPES,
  HOST_EXPERIENCES,
  HOST_LANGUAGES,
  HOST_RELATIONS,
  HOST_SEATS,
  YES_NO,
  toOptions,
} from '../lib/hostOptions'

/**
 * "Earn from events" (/earn): families who'd open their wedding or function to
 * foreign travellers for a fee. Hosts only for now — the team verifies each
 * family and arranges guests and payouts offline; there is no booking or
 * payment flow on the site yet. Public can create; only admin can read.
 */
export const HostApplications: CollectionConfig = {
  slug: 'host-applications',
  labels: { singular: 'Host application', plural: 'Host applications' },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'eventType', 'eventDate', 'city', 'status', 'createdAt'],
    description:
      'Families who want to host foreign guests at their event (/earn). Verify the family before listing.',
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      notifySubmission('host application', [
        'name',
        'phone',
        'email',
        'relation',
        'eventType',
        'eventDate',
        'days',
        'city',
        'venueArea',
        'language',
        'guestCount',
        'touristSeats',
        'experiences',
        'englishSpeaker',
        'rituals',
        'message',
      ]),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Full name' },
    { name: 'phone', type: 'text', required: true, label: 'Phone / WhatsApp' },
    { name: 'email', type: 'email' },
    { name: 'relation', type: 'select', label: 'Relation to the event', options: toOptions(HOST_RELATIONS) },

    { name: 'eventType', type: 'select', required: true, options: toOptions(HOST_EVENT_TYPES) },
    {
      name: 'eventDate',
      type: 'date',
      required: true,
      label: 'Event date (first day)',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    { name: 'days', type: 'select', required: true, label: 'Number of days', options: toOptions(HOST_DAYS) },
    {
      name: 'city',
      type: 'select',
      required: true,
      defaultValue: 'chennai',
      options: toOptions(HOST_CITIES),
    },
    { name: 'venueArea', type: 'text', label: 'Venue / area' },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'tamil',
      label: 'Family language',
      options: toOptions(HOST_LANGUAGES),
    },
    { name: 'guestCount', type: 'number', label: 'Expected total attendance', min: 0 },
    {
      name: 'touristSeats',
      type: 'select',
      required: true,
      label: 'Foreign guests welcome',
      options: toOptions(HOST_SEATS),
    },
    {
      name: 'experiences',
      type: 'select',
      hasMany: true,
      label: 'Can also offer',
      options: toOptions(HOST_EXPERIENCES),
    },
    {
      name: 'englishSpeaker',
      type: 'select',
      label: 'English-speaking family member to look after guests',
      options: toOptions(YES_NO),
    },
    { name: 'rituals', type: 'textarea', label: 'Ceremonies guests would see' },
    { name: 'message', type: 'textarea', label: 'Anything else' },
    {
      name: 'consent',
      type: 'checkbox',
      required: true,
      label: 'Family agrees to welcome foreign guests and to be contacted',
      validate: (value: boolean | null | undefined) =>
        value === true || 'The family must agree before we can list the event.',
    },

    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Verified (met the family)', value: 'verified' },
        { label: 'Listed — matching guests', value: 'listed' },
        { label: 'Declined', value: 'declined' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'payoutNotes',
      type: 'textarea',
      label: 'Guests & payout notes',
      admin: { position: 'sidebar', description: 'Internal — guests matched, amounts, paid date.' },
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'earn-page',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
