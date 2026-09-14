import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { slugField } from '../fields/slug'

/**
 * Past-work showcase — THE most important collection. Each project is one
 * event with a cover image and a photo gallery, filterable by event type.
 */
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Gallery Project', plural: 'Gallery (Our Work)' },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'branch', 'featured'],
    description: 'Your past events. Clients decide based on these photos.',
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      admin: { description: 'Event type — used for gallery filtering.' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'Main image shown in the gallery grid.' },
    },
    {
      name: 'photos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: { description: 'All photos for this event (shown in the lightbox).' },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'branch',
      type: 'select',
      options: [
        { label: 'Guduvancheri', value: 'guduvancheri' },
        { label: 'Thiruverkadu', value: 'thiruverkadu' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'location', type: 'text', admin: { position: 'sidebar' } },
    { name: 'date', type: 'date', admin: { position: 'sidebar' } },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Show on the home page.' },
    },
  ],
}
