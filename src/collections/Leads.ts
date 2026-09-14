import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { notifySubmission } from '../hooks/notifySubmission'

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
      ]),
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
