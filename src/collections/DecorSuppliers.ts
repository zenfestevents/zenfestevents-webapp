import type { CollectionConfig } from 'payload'

import { canView, canWork, ownerOnly } from '../access/roles'
import { toWaNumber } from '../lib/whatsapp/phone'

/**
 * The people who supply decorations (stage decorators, florists, balloon artists…). Kept
 * apart from marketplace `vendors` (accounts that log in) because most suppliers never
 * sign up; link the account when there is one. Staff only — never shown on the website,
 * in exports or in any public API.
 */
export const DecorSuppliers: CollectionConfig = {
  slug: 'decor-suppliers',
  labels: { singular: 'Decor supplier', plural: 'Decor suppliers' },
  access: {
    read: canView,
    create: canWork,
    update: canWork,
    delete: ownerOnly,
  },
  admin: {
    group: 'Decorations',
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'area', 'updatedAt'],
    listSearchableFields: ['name', 'phone', 'area'],
    description: 'Who supplies each decoration, with their phone and area. Only the team sees this.',
  },
  defaultSort: 'name',
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Supplier / business name', maxLength: 120 },
    {
      name: 'phone',
      type: 'text',
      unique: true,
      index: true,
      label: 'Phone / WhatsApp',
      admin: { description: 'Any format; saved as 91XXXXXXXXXX.' },
      validate: (value: unknown) => (!value || toWaNumber(value) ? true : 'Enter a valid phone number.'),
      hooks: {
        beforeChange: [({ value }) => (value ? toWaNumber(value) : null)],
      },
    },
    { name: 'area', type: 'text', label: 'Area / city', maxLength: 120 },
    {
      name: 'vendorAccount',
      type: 'relationship',
      relationTo: 'vendors',
      label: 'Marketplace account (if they have one)',
      admin: { position: 'sidebar' },
    },
    { name: 'notes', type: 'textarea', label: 'Notes (team only)' },
  ],
}
