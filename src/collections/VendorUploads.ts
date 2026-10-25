import { APIError, type CollectionConfig } from 'payload'

import { anyone } from '../access'
import { adminHidden, canManage, canView, ownerOnly } from '../access/roles'


/** Largest file a vendor can upload. Also Airtable's attachment-upload limit is 5 MB. */
export const VENDOR_UPLOAD_MAX_BYTES = 4 * 1024 * 1024

/**
 * Files vendors attach to their application: FSSAI certificates and menu
 * cards. The public can upload (that's how the form sends them) but only the
 * admin can see them — files are served through Payload's access control.
 */
export const VendorUploads: CollectionConfig = {
  slug: 'vendor-uploads',
  labels: { singular: 'Vendor document', plural: 'Vendor documents' },
  access: {
    read: canView,
    create: anyone,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'Vendors',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'kind', 'createdAt'],
    description: 'Documents vendors sent with their application (FSSAI certificate, menu card).',
    hidden: adminHidden('vendor-uploads'),
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
