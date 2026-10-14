import type { CollectionConfig } from 'payload'

import { anyone, authenticated, isAdminField } from '../access'
import { ALL_SERVICES, EXTRA_SHOOTS } from '../lib/eventRequirements'
import { notifySubmission } from '../hooks/notifySubmission'
import { syncLeadToContacts } from '../hooks/syncOccasionFromWebsite'

/** Field-level: only signed-in admins (the Local API used by Zenfest AI bypasses access). */
const adminOnly = isAdminField

/** A text hasMany limited to a known list (a list, not an enum, so adding one needs no migration). */
const oneOf =
  (allowed: Set<string>, what: string) =>
  (value: unknown): true | string => {
    if (value == null) return true
    if (!Array.isArray(value)) return `Choose ${what} from the list.`
    if (value.length > 40) return `Too many ${what}.`
    return value.every((v) => typeof v === 'string' && allowed.has(v)) || `Choose ${what} from the list.`
  }
const SHOOTS = new Set<string>(EXTRA_SHOOTS.map(([v]) => v))

/** Inquiry-form submissions. Public can create; only admin can read/manage. */
export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Lead / Enquiry', plural: 'Leads & Enquiries' },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'eventType', 'eventDate', 'status', 'createdAt'],
    description: 'Enquiries submitted through the website. Call these back.',
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      notifySubmission('enquiry', [
        'name',
        'phone',
        'email',
        'eventType',
        'eventDate',
        'branch',
        'message',
        'aiPlan',
        'requirements.weddingParts',
        'requirements.startTime',
        'requirements.location',
        'requirements.services',
        'requirements.receptionServices',
        'requirements.weddingServices',
        'requirements.extraShoots',
        'requirements.birthdayFor',
        'requirements.birthdaySurprise',
        'requirements.guestCount',
        'requirements.budget',
      ]),
      syncLeadToContacts,
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text', required: true },
    { name: 'email', type: 'email' },
    {
      name: 'eventType',
      type: 'select',
      options: [
        { label: 'Wedding', value: 'wedding' },
        { label: 'Birthday', value: 'birthday' },
        { label: 'Corporate function', value: 'corporate' },
        { label: 'Baby shower', value: 'babyshower' },
        { label: 'Housewarming', value: 'housewarming' },
        { label: 'Sports event', value: 'sports' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'eventDate', type: 'date' },
    {
      name: 'branch',
      type: 'select',
      options: [
        { label: 'Guduvancheri', value: 'guduvancheri' },
        { label: 'Thiruverkadu', value: 'thiruverkadu' },
        { label: 'No preference', value: 'any' },
      ],
    },
    { name: 'message', type: 'textarea' },
    {
      // The "Plan your event" form (/enquire, lib/eventRequirements.ts) — what the team's
      // Tally forms used to ask. Empty for other enquiries, so it's hidden for them.
      name: 'requirements',
      type: 'group',
      label: 'Event requirements',
      admin: {
        condition: (data) => Boolean(data?.requirements?.location || data?.requirements?.guestCount),
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'weddingParts', type: 'text', label: 'Which functions', maxLength: 40 },
            { name: 'startTime', type: 'text', label: 'Start time', maxLength: 20 },
            { name: 'location', type: 'text', label: 'Event location', maxLength: 200 },
          ],
        },
        {
          name: 'services',
          type: 'text',
          hasMany: true,
          label: 'Services wanted',
          validate: oneOf(ALL_SERVICES, 'services'),
        },
        {
          name: 'receptionServices',
          type: 'text',
          hasMany: true,
          label: 'Reception services',
          validate: oneOf(ALL_SERVICES, 'services'),
        },
        {
          name: 'weddingServices',
          type: 'text',
          hasMany: true,
          label: 'Wedding services',
          validate: oneOf(ALL_SERVICES, 'services'),
        },
        {
          name: 'extraShoots',
          type: 'text',
          hasMany: true,
          label: 'Extra shoot',
          validate: oneOf(SHOOTS, 'shoots'),
        },
        {
          type: 'row',
          fields: [
            { name: 'birthdayFor', type: 'text', label: 'Birthday for', maxLength: 40 },
            { name: 'birthdaySurprise', type: 'checkbox', label: 'Wants a birthday surprise' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'guestCount', type: 'number', label: 'Guest count', min: 1, max: 100000 },
            { name: 'budget', type: 'text', label: 'Approximate budget', maxLength: 60 },
          ],
        },
      ],
    },
    {
      // Written server-side by Zenfest AI (plan/actions.ts); the public REST create
      // can't set it, so a form POST can't pose as an AI plan.
      name: 'aiPlan',
      type: 'textarea',
      label: 'Zenfest AI plan',
      access: { create: adminOnly, update: adminOnly },
      admin: {
        readOnly: true,
        condition: (data) => Boolean(data?.aiPlan),
        description: 'Drafted with the customer by Zenfest AI. Estimates only — confirm before quoting.',
      },
    },
    {
      // Virtual (no column): the chat links to the lead, not both ways — a two-way
      // relationship made the local SQLite schema push fail on every start.
      name: 'aiConversation',
      type: 'join',
      collection: 'ai-conversations',
      on: 'lead',
      label: 'Zenfest AI chat',
      admin: { condition: (data) => Boolean(data?.aiPlan) },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Quoted', value: 'quoted' },
        { label: 'Booked', value: 'booked' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'website',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
