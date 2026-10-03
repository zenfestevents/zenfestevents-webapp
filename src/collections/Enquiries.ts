import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'
import { ENQUIRY_STATUSES, EVENT_TYPES, toOptionList } from '../lib/marketplaceOptions'

/**
 * Quote requests from a logged-in couple to one marketplace vendor, with the
 * conversation that follows. Admin-only over REST: couples and vendors read and
 * write them through Server Actions that check the session owns the enquiry.
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  labels: { singular: 'Marketplace Enquiry', plural: 'Marketplace Enquiries' },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  admin: {
    group: 'Marketplace',
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'vendor', 'customer', 'eventDate', 'status', 'updatedAt'],
    description: 'Quote requests couples sent to vendors through the marketplace.',
  },
  defaultSort: '-updatedAt',
  fields: [
    { name: 'summary', type: 'text', admin: { readOnly: true } },
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'vendor', type: 'relationship', relationTo: 'vendors', required: true, index: true },
    { name: 'eventType', type: 'select', options: toOptionList(EVENT_TYPES) },
    { name: 'eventDate', type: 'date' },
    { name: 'guests', type: 'number' },
    { name: 'area', type: 'text' },
    { name: 'budget', type: 'number', label: 'Budget (₹)' },
    { name: 'message', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: toOptionList(ENQUIRY_STATUSES),
      admin: { position: 'sidebar' },
    },
    {
      // Who has an unread message — drives the "new" badges on both dashboards.
      name: 'unreadFor',
      type: 'select',
      options: [
        { label: 'Vendor', value: 'vendor' },
        { label: 'Customer', value: 'customer' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'thread',
      type: 'array',
      fields: [
        {
          name: 'from',
          type: 'select',
          required: true,
          options: [
            { label: 'Vendor', value: 'vendor' },
            { label: 'Customer', value: 'customer' },
          ],
        },
        { name: 'text', type: 'textarea', required: true },
        { name: 'quote', type: 'number', label: 'Quote (₹)' },
        { name: 'at', type: 'date', required: true },
      ],
    },
  ],
}
