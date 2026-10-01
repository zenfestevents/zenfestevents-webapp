import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'
import { ITEM_TYPES, toOptions } from '../lib/registryOptions'

/**
 * Gifts on a registry. Whether an item is claimed lives in `registry-claims`
 * (one row per item, enforced by a unique index), not here — see that file.
 * Admin-only over the API; hosts and guests go through server actions.
 */
export const RegistryItems: CollectionConfig = {
  slug: 'registry-items',
  labels: { singular: 'Registry gift', plural: 'Registry gifts' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Gift Registry',
    useAsTitle: 'title',
    defaultColumns: ['title', 'event', 'itemType', 'price', 'merchant', 'createdAt'],
  },
  defaultSort: 'sortOrder',
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'registry-events',
      required: true,
      index: true,
    },
    { name: 'itemType', type: 'select', required: true, options: toOptions(ITEM_TYPES) },
    { name: 'title', type: 'text', required: true },
    { name: 'price', type: 'number', min: 0, label: 'Price (₹)' },
    { name: 'imageUrl', type: 'text' },
    { name: 'originalUrl', type: 'text', label: 'Product link' },
    { name: 'merchant', type: 'text' },
    { name: 'note', type: 'textarea', label: 'Note for guests (colour, size, where to buy)' },
    {
      name: 'targetAmount',
      type: 'number',
      min: 0,
      label: 'Fund target (₹)',
      admin: { condition: (data) => data?.itemType === 'cash_fund' },
    },
    {
      name: 'raisedAmount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Received so far (₹)',
      admin: {
        condition: (data) => data?.itemType === 'cash_fund',
        description: 'Updated by the host as shagun arrives (guests pay the family directly).',
      },
    },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
