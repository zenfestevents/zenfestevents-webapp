import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'

/** One row per guest sent to a store from a registry — affiliate click tracking. */
export const RegistryClicks: CollectionConfig = {
  slug: 'registry-clicks',
  labels: { singular: 'Store click', plural: 'Store clicks' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Gift Registry',
    defaultColumns: ['merchant', 'item', 'event', 'affiliated', 'createdAt'],
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'item', type: 'relationship', relationTo: 'registry-items', index: true },
    { name: 'event', type: 'relationship', relationTo: 'registry-events', index: true },
    { name: 'merchant', type: 'text' },
    {
      name: 'affiliated',
      type: 'checkbox',
      label: 'Sent with an affiliate tag',
      defaultValue: false,
    },
  ],
}
