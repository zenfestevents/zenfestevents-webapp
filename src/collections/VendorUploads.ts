import { APIError, type CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'

/** Largest file a vendor can upload. Also Airtable's attachment-upload limit is 5 MB. */
export const VENDOR_UPLOAD_MAX_BYTES = 4 * 1024 * 1024

/**
 * Files vendors attach to their application: FSSAI certificates and menu
 * cards. The public can upload (that's how the form sends them) but only the
 * admin can see them — files are served through Payload's access control.
 */
export const VendorUploads: CollectionConfig = {
  slug: 'vendor-uploads',
  labels: { singular: 'Vendor Upload', plural: 'Vendor Uploads' },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'kind', 'createdAt'],
    description: 'FSSAI certificates and menu cards sent with vendor applications.',
    group: 'System',
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
  },
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        if (operation === 'create' && req.file && req.file.size > VENDOR_UPLOAD_MAX_BYTES) {
          throw new APIError('File is too large — the limit is 4 MB.', 413, null, true)
        }
      },
    ],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [
        { label: 'FSSAI certificate', value: 'fssai' },
        { label: 'Menu card', value: 'menu' },
        { label: 'Other', value: 'other' },
      ],
    },
  ],
}
