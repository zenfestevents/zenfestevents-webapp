import crypto from 'node:crypto'

import { APIError, type Access, type CollectionConfig } from 'payload'

import { canWork, hasRole, ownerOnly } from '../access/roles'

/** Vercel functions cap request bodies at 4.5 MB; the Quick add screen shrinks photos first. */
export const DECOR_PHOTO_MAX_BYTES = 4 * 1024 * 1024

/**
 * Anyone may load a photo *file* (they're on the public catalog), but only staff may list
 * or read the photo records over REST/GraphQL — so nobody can page through every upload,
 * including photos of draft items. `isReadingStaticFile` is Payload's flag for
 * `/api/decor-photos/file/<name>`.
 */
const readPhotos: Access = ({ req, isReadingStaticFile }) =>
  hasRole(req.user, 'viewer') || Boolean(isReadingStaticFile)

/**
 * Decoration catalog photos. Each upload is shrunk to at most 1600 px wide and saved as
 * WebP, with a square thumbnail and a 4:3 card copy. Files live in Vercel Blob in
 * production (local `decor-photos/` folder in dev); the database stores only the file
 * names and URLs. Files get a random name, so a phone's "kumar-decorators-stage.jpg"
 * never reaches the public.
 */
export const DecorPhotos: CollectionConfig = {
  slug: 'decor-photos',
  labels: { singular: 'Decor photo', plural: 'Decor photos' },
  access: {
    read: readPhotos,
    create: canWork,
    update: canWork,
    delete: ownerOnly,
  },
  admin: {
    group: 'Decorations',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'createdAt'],
    description: 'Photos of decorations. Add them from a decoration item; they are resized automatically.',
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    // High-res master (owner, 2026-10-31): at most 2560 px on the long edge, never enlarged,
    // saved as WebP. Phones already shrink to this before uploading (AddPhotos / Quick add),
    // which keeps every upload under Vercel's 4.5 MB request limit.
    resizeOptions: { width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      // Admin list and shortlists.
      { name: 'thumbnail', width: 400, height: 400, crop: 'center', formatOptions: { format: 'webp', options: { quality: 72 } } },
      // The /decorations grid (4:3 cards, ~60–120 KB).
      { name: 'card', width: 800, height: 600, crop: 'center', formatOptions: { format: 'webp', options: { quality: 76 } } },
      // The item page gallery; the full master loads only on "tap to zoom".
      {
        name: 'large',
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        if ((operation === 'create' || operation === 'update') && req.file) {
          if (req.file.size > DECOR_PHOTO_MAX_BYTES) {
            throw new APIError('Photo is too large — the limit is 4 MB. Use Quick add, which shrinks photos for you.', 413, null, true)
          }
          // Random file name: the uploaded name may carry a supplier's name.
          req.file.name = `decor-${crypto.randomBytes(6).toString('hex')}.webp`
        }
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Describe the photo (optional)',
      maxLength: 160,
      admin: { description: 'Shown to screen readers. Never put the supplier’s name here — it is public.' },
    },
  ],
}
