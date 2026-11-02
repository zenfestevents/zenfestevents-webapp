import type { CollectionConfig } from 'payload'

import { accessFor, moduleHidden } from '../access/roles'

const { canView, canManage, canDelete } = accessFor('website', 'registry-clicks')


/** One row per visitor sent to a partner store from a registry or the shop — affiliate click tracking. */
export const RegistryClicks: CollectionConfig = {
  slug: 'registry-clicks',
  labels: { singular: 'Store click', plural: 'Store clicks' },
  access: {
    read: canView,
    create: canManage,
    update: canManage,
    delete: canDelete,
  },
  admin: {
    group: 'Gift Registry',
    defaultColumns: ['merchant', 'product', 'item', 'event', 'affiliated', 'createdAt'],
    hidden: moduleHidden('website', 'registry-clicks'),
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'item', type: 'relationship', relationTo: 'registry-items', index: true },
    { name: 'event', type: 'relationship', relationTo: 'registry-events', index: true },
    { name: 'product', type: 'relationship', relationTo: 'products', index: true },
    { name: 'merchant', type: 'text' },
    {
      name: 'affiliated',
      type: 'checkbox',
      label: 'Sent with an affiliate tag',
      defaultValue: false,
    },
  ],
}
