import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'
import { notifySubmission } from '../hooks/notifySubmission'
import { REGISTRY_EVENT_TYPES, SLUG_PATTERN, toOptions } from '../lib/registryOptions'

/**
 * Gift registries (`/r/[slug]`). Hosts have no account: each registry has a
 * secret manage key (only its hash is stored here) and the host dashboard is
 * `/dashboard/[slug]?key=…`. Public pages and the dashboard read this through
 * `lib/registry.ts` with `overrideAccess`, never through the REST API — so the
 * API stays admin-only.
 */
export const RegistryEvents: CollectionConfig = {
  slug: 'registry-events',
  labels: { singular: 'Registry', plural: 'Registries' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Gift Registry',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'eventType', 'eventDate', 'hostName', 'hostPhone', 'createdAt'],
    description: 'Gift registries made by families at /registry. Every new one is also a warm lead.',
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      notifySubmission('gift registry', [
        'title',
        'slug',
        'eventType',
        'eventDate',
        'venueName',
        'venueCity',
        'hostName',
        'hostPhone',
        'hostEmail',
      ]),
    ],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Address (/r/…)',
      validate: (value: string | null | undefined) =>
        (value && SLUG_PATTERN.test(value)) ||
        'Use 3–40 lowercase letters, numbers and hyphens.',
    },
    { name: 'title', type: 'text', required: true, label: 'Title (e.g. "Rahul & Neha’s Wedding")' },
    { name: 'eventType', type: 'select', required: true, options: toOptions(REGISTRY_EVENT_TYPES) },
    { name: 'hostNames', type: 'text', label: 'Names shown on the page (e.g. "Rahul & Neha")' },
    {
      name: 'eventDate',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, h:mm a' } },
    },
    { name: 'venueName', type: 'text' },
    { name: 'venueCity', type: 'text' },
    { name: 'venueMapUrl', type: 'text', label: 'Google Maps link' },
    { name: 'welcomeNote', type: 'textarea', label: 'Note to guests' },
    {
      name: 'upiId',
      type: 'text',
      label: 'Host UPI ID (for shagun)',
      admin: { description: 'Guests pay the family directly — no money passes through Zenfest.' },
    },
    { name: 'upiName', type: 'text', label: 'Name on the UPI account' },
    {
      name: 'revealClaims',
      type: 'checkbox',
      defaultValue: false,
      label: 'Host can see who claimed what',
      admin: { description: 'Off = surprise mode: the host sees counts only.' },
    },

    { name: 'hostName', type: 'text', required: true, label: 'Host contact name' },
    {
      name: 'hostPhone',
      type: 'text',
      required: true,
      label: 'Host phone / WhatsApp',
      admin: { components: { Cell: '/components/admin/WhatsAppCell#WhatsAppCell' } },
    },
    { name: 'hostEmail', type: 'email' },
    {
      name: 'manageKeyHash',
      type: 'text',
      required: true,
      admin: { hidden: true },
      access: { read: () => false, update: () => false },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Hidden', value: 'hidden' },
      ],
      admin: { position: 'sidebar', description: 'Hidden registries show “not found” to guests.' },
    },
    {
      name: 'leadStatus',
      type: 'select',
      defaultValue: 'new',
      label: 'Zenfest follow-up',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Booked an event with us', value: 'booked' },
        { label: 'Not interested', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
