import type { CollectionConfig } from 'payload'

import { adminOrSelf, isAdmin, isAdminField } from '../access'
import { accountAuth } from './accountAuth'

/**
 * Couple / customer accounts. They shortlist marketplace vendors and send quote
 * requests. Writes go through Server Actions (app/(frontend)/account/**), so
 * REST create/update is admin-only; Payload's login/me/forgot endpoints still work.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Customer', plural: 'Customers' },
  auth: accountAuth({ reset: '/account/reset-password', verify: '/account/verify-email' }),
  access: {
    read: adminOrSelf('customers'),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    group: 'Marketplace',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phone', 'eventDate', 'createdAt'],
    description: 'Couples and families with a Zenfest account.',
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text', required: true },
    {
      name: 'phoneVerified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Phone verified on WhatsApp',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      // Set when the account signs in with Google (lib/googleAuth.ts).
      name: 'googleId',
      type: 'text',
      unique: true,
      index: true,
      label: 'Google account ID',
      access: { create: isAdminField, read: isAdminField, update: isAdminField },
      admin: { position: 'sidebar', readOnly: true, description: 'Set when they sign in with Google.' },
    },
    { name: 'city', type: 'text', label: 'Area / city' },
    { name: 'eventDate', type: 'date', label: 'Event date (if known)' },
    { name: 'shortlist', type: 'relationship', relationTo: 'vendors', hasMany: true },
    {
      name: 'marketingConsent',
      type: 'checkbox',
      defaultValue: false,
      label: 'Agreed to offers on WhatsApp / email',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
