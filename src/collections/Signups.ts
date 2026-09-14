import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { notifySubmission } from '../hooks/notifySubmission'

/**
 * Sign-ups from the ₹100-off offer. Public can create; only admin can read.
 * Birthdays are kept so the team can send a greeting and a seasonal offer.
 * When someone says they're planning an event, the form collects the event
 * details too — those live in the second group of fields below.
 */
export const Signups: CollectionConfig = {
  slug: 'signups',
  labels: { singular: 'Sign-up', plural: 'Sign-ups' },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'birthday', 'planningEvent', 'status', 'createdAt'],
    description:
      'People who signed up for the ₹100-off offer. Honour the discount when quoting.',
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      notifySubmission('sign-up', [
        'name',
        'phone',
        'birthday',
        'planningEvent',
        'eventType',
        'eventDate',
        'guestCount',
        'message',
      ]),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Full name' },
    { name: 'phone', type: 'text', required: true, label: 'Phone number' },
    {
      name: 'birthday',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    {
      name: 'planningEvent',
      type: 'select',
      required: true,
      defaultValue: 'no',
      label: 'Planning an event?',
      options: [
        { label: 'Yes — planning an event', value: 'yes' },
        { label: 'Not right now', value: 'no' },
      ],
    },

    /* ---- only filled in when planningEvent is "yes" ---- */
    {
      name: 'eventType',
      type: 'select',
      admin: { condition: (data) => data?.planningEvent === 'yes' },
      options: [
        { label: 'Wedding', value: 'wedding' },
        { label: 'Birthday', value: 'birthday' },
        { label: 'Corporate function', value: 'corporate' },
        { label: 'Housewarming', value: 'housewarming' },
        { label: 'Sports event', value: 'sports' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'eventDate',
      type: 'date',
      admin: {
        condition: (data) => data?.planningEvent === 'yes',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
      },
    },
    {
      name: 'guestCount',
      type: 'number',
      admin: { condition: (data) => data?.planningEvent === 'yes' },
    },
    {
      name: 'message',
      type: 'textarea',
      admin: { condition: (data) => data?.planningEvent === 'yes' },
    },

    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Discount honoured', value: 'redeemed' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'offer',
      type: 'text',
      defaultValue: 'SIGNUP100',
      label: 'Offer',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'signup-page',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
