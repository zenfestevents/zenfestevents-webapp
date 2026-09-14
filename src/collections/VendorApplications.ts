import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { notifySubmission } from '../hooks/notifySubmission'

/** Vendor enrollment submissions. Public can create; only admin can manage. */
export const VendorApplications: CollectionConfig = {
  slug: 'vendor-applications',
  labels: { singular: 'Vendor Application', plural: 'Vendor Applications' },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'vendorType', 'phone', 'city', 'status', 'createdAt'],
    description: 'Vendors who want to work with Zenfest Events.',
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      notifySubmission('vendor application', [
        'name',
        'businessName',
        'vendorType',
        'phone',
        'email',
        'city',
        'portfolioUrl',
        'message',
      ]),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'businessName', type: 'text' },
    {
      name: 'vendorType',
      type: 'select',
      required: true,
      options: [
        { label: 'Decoration', value: 'decoration' },
        { label: 'Catering', value: 'catering' },
        { label: 'Photography', value: 'photography' },
        { label: 'DJ / Music', value: 'dj' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'phone', type: 'text', required: true },
    { name: 'email', type: 'email' },
    { name: 'city', type: 'text' },
    {
      name: 'portfolioUrl',
      type: 'text',
      admin: { description: 'Link to work samples / Instagram / website.' },
    },
    { name: 'message', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
