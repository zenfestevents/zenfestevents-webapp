import type { CollectionConfig } from 'payload'

import { anyone } from '../access'
import { adminHidden, canManage, ownerOnly } from '../access/roles'


export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Photos' },
  access: {
    read: anyone,
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'Website',
    useAsTitle: 'alt',
    description: 'Photos used on the website. Upload them here, then pick them in “Our work” or “Services”.',
    hidden: adminHidden('media'),
  },
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, crop: 'center' },
      { name: 'card', width: 768 },
      { name: 'feature', width: 1400 },
      { name: 'og', width: 1200, height: 630, crop: 'center' },
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Alt text (describe the photo)',
      type: 'text',
      required: true,
      admin: { description: 'Shown to screen readers and if the image fails to load.' },
    },
    { name: 'caption', type: 'text' },
  ],
}
