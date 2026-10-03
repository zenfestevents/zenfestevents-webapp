import { APIError, type CollectionConfig } from 'payload'

import { adminOrVendorOwner, anyone } from '../access'

/** Largest listing photo. Vercel functions cap request bodies at 4.5 MB. */
export const VENDOR_MEDIA_MAX_BYTES = 4 * 1024 * 1024
/** Photos a vendor can keep in their library. */
export const VENDOR_MEDIA_MAX_COUNT = 30

/**
 * Photos for marketplace listings. Uploaded by logged-in vendors over REST
 * (`/api/vendor-media`, multipart) so files skip the Server Action body limit;
 * the owner is always taken from the session, never from the request.
 * Public read: they're shown on the listing (draft photos are harmless).
 */
export const VendorMedia: CollectionConfig = {
  slug: 'vendor-media',
  labels: { singular: 'Vendor Photo', plural: 'Vendor Photos' },
  access: {
    read: anyone,
    create: ({ req }) => req.user?.collection === 'vendors' || req.user?.collection === 'users',
    update: adminOrVendorOwner('vendor'),
    delete: adminOrVendorOwner('vendor'),
  },
  admin: {
    group: 'Marketplace',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'vendor', 'createdAt'],
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, crop: 'center' },
      { name: 'card', width: 800, height: 600, crop: 'center' },
      { name: 'feature', width: 1600 },
    ],
  },
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        if (operation === 'create' && req.file && req.file.size > VENDOR_MEDIA_MAX_BYTES) {
          throw new APIError('Photo is too large — the limit is 4 MB.', 413, null, true)
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || req.user?.collection !== 'vendors') return data
        data.vendor = req.user.id
        const { totalDocs } = await req.payload.count({
          collection: 'vendor-media',
          where: { vendor: { equals: req.user.id } },
          overrideAccess: true,
          req,
        })
        if (totalDocs >= VENDOR_MEDIA_MAX_COUNT) {
          throw new APIError(
            `You can keep up to ${VENDOR_MEDIA_MAX_COUNT} photos. Delete one to add another.`,
            400,
            null,
            true,
          )
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    { name: 'alt', type: 'text' },
  ],
}
