import type { CollectionConfig } from 'payload'

import { anyone } from '../access'
import { adminHidden, canManage, ownerOnly } from '../access/roles'
import { slugField } from '../fields/slug'
import { CONTENT_TAGS } from '../lib/contentCache'
import { revalidateCollection } from '../hooks/revalidateContent'

/**
 * Past-work showcase — THE most important collection. Each project is one
 * event with a cover image and a photo gallery, filterable by event type.
 */
export const Projects: CollectionConfig = {
  slug: 'projects',
  hooks: revalidateCollection(CONTENT_TAGS.projects),
  labels: { singular: 'Our work item', plural: 'Our work (gallery)' },
  access: {
    read: anyone,
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'Website',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'branch', 'featured'],
    description: 'Past events shown on the website. Clients decide based on these photos.',
    hidden: adminHidden('projects'),
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
