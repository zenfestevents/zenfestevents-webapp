import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo / Image', plural: 'Photos & Images' },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: { useAsTitle: 'alt', description: 'Upload gallery and site images here.' },
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
