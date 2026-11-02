import type { CollectionConfig } from 'payload'

import { anyone } from '../access'
import { accessFor, moduleHidden } from '../access/roles'
import { slugField } from '../fields/slug'

const { canManage, canDelete } = accessFor('website')

/** Combined service packages the client can browse and enquire about. */
export const Packages: CollectionConfig = {
  slug: 'packages',
  labels: { singular: 'Package', plural: 'Packages' },
  access: {
    read: anyone,
    create: canManage,
    update: canManage,
    delete: canDelete,
  },
  admin: {
    group: 'Website',
    useAsTitle: 'title',
    defaultColumns: ['title', 'priceNote', 'featured', 'order'],
    description: 'Ready-made packages (not shown on the website yet).',
    hidden: moduleHidden('website', 'packages'),
  },
  defaultSort: 'order',
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'tagline', type: 'text', admin: { description: 'Short one-liner.' } },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'idealFor',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { description: 'Which event types this package suits.' },
    },
    {
      name: 'includedServices',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
    },
    {
      name: 'highlights',
      type: 'array',
      labels: { singular: 'Highlight', plural: 'Highlights' },
      fields: [{ name: 'item', type: 'text', required: true }],
      admin: { description: 'Bullet points shown on the package card.' },
    },
    {
      name: 'priceNote',
      type: 'text',
      admin: {
        description: 'e.g. "Starting from ₹75,000" or "Custom quote". Optional.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Highlight on the home page.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers show first.' },
    },
  ],
}
