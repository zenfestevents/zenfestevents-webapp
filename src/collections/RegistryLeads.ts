import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { notifySubmission } from '../hooks/notifySubmission'
import { LEAD_EVENT_TYPES, toOptions } from '../lib/registryOptions'

/**
 * "Plan with Zenfest" leads from the banner on every guest registry page
 * (`components/registry/PlanBanner.tsx` POSTs to /api/registry-leads).
 * Public can create; only admin can read.
 */
export const RegistryLeads: CollectionConfig = {
  slug: 'registry-leads',
  labels: { singular: 'Registry lead', plural: 'Registry leads' },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Gift Registry',
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'eventType', 'tentativeDate', 'city', 'referringEvent', 'status', 'createdAt'],
    description: 'Guests who tapped “Plan with Zenfest” on someone’s registry. Call or WhatsApp them.',
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      notifySubmission('registry lead', ['name', 'phone', 'eventType', 'tentativeDate', 'city', 'referringEvent']),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    {
      name: 'phone',
      type: 'text',
      required: true,
      maxLength: 20,
      admin: { components: { Cell: '/components/admin/WhatsAppCell#WhatsAppCell' } },
    },
    { name: 'eventType', type: 'select', options: toOptions(LEAD_EVENT_TYPES) },
    { name: 'tentativeDate', type: 'date', admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } } },
    { name: 'city', type: 'text', maxLength: 80 },
    {
      name: 'referringEvent',
      type: 'text',
      maxLength: 60,
      label: 'Came from registry',
      admin: { description: 'Slug of the registry the guest was viewing.' },
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
  ],
}
