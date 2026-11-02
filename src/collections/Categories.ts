import type { CollectionConfig } from 'payload'

import { anyone } from '../access'
import { accessFor, moduleHidden } from '../access/roles'
import { slugField } from '../fields/slug'

const { canManage, canDelete } = accessFor('website')

/** Event types: Weddings, Birthdays, Corporate, Housewarmings, Sports, etc. */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Event type', plural: 'Event types' },
  access: {
    read: anyone,
    create: canManage,
    update: canManage,
    delete: canDelete,
  },
  admin: {
    group: 'Website',
    useAsTitle: 'title',
    defaultColumns: ['title', 'order'],
    description: 'Kinds of events (Wedding, Birthday…) used to sort the gallery.',
    hidden: moduleHidden('website', 'categories'),
  },
  defaultSort: 'order',
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'description', type: 'textarea' },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional cover image for this event type.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers show first.' },
    },
  ],
}
