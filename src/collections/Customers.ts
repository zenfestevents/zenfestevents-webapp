import type { CollectionConfig } from 'payload'

import { adminOrSelf } from '../access'
import { adminHidden, canManage, canManageField, canViewField, ownerOnly } from '../access/roles'
import { assignReferralCode, customerRuns } from '../hooks/runsClub'
import { accountAuth } from './accountAuth'

/**
 * Couple / customer accounts. They shortlist marketplace vendors and send quote
 * requests. Writes go through Server Actions (app/(frontend)/account/**), so
 * REST create/update is admin-only; Payload's login/me/forgot endpoints still work.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Client account', plural: 'Client accounts' },
  auth: accountAuth({ reset: '/account/reset-password', verify: '/account/verify-email' }),
  access: {
    read: adminOrSelf('customers'),
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'Clients',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phone', 'eventDate', 'createdAt'],
    description: 'Couples and families who made an account on the website. Usually nothing to do here.',
    hidden: adminHidden('customers'),
  },
  defaultSort: '-createdAt',
  hooks: { beforeChange: [assignReferralCode], afterChange: [customerRuns] },
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
      access: { create: canManageField, read: canViewField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true, description: 'Set when they sign in with Google.' },
    },
    {
      // Runs club total — a cache of the sum of this account's `runs` rows (lib/rewards.ts).
      name: 'runs',
      type: 'number',
      defaultValue: 0,
      label: 'Runs',
      access: { create: canManageField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true, description: 'Runs club total. Add a Runs entry to change it.' },
    },
    {
      // Share code for /invite/<code>; set on create, back-filled by the Runs club migration.
      name: 'referralCode',
      type: 'text',
      unique: true,
      index: true,
      access: { create: canManageField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      // `c:<id>` / `v:<id>`: who invited this account (lib/rewards.ts). Set in code from the
      // /invite/<code> cookie, never from the request.
      name: 'referredBy',
      type: 'text',
      label: 'Invited by',
      index: true,
      access: { create: canManageField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true, description: 'c:<id> = couple, v:<id> = vendor.' },
    },
    { name: 'city', type: 'text', label: 'Area / city' },
    { name: 'eventDate', type: 'date', label: 'Event date (if known)' },
    { name: 'shortlist', type: 'relationship', relationTo: 'vendors', hasMany: true },
    {
      // Saved decorations ("My list" on /decorations). Read and written only through
      // lib/decorations.ts, so a couple's /api/customers/me never carries decor records.
      name: 'decorShortlist',
      type: 'relationship',
      relationTo: 'decor-items',
      hasMany: true,
      label: 'Saved decorations',
      access: { read: canViewField, create: canManageField, update: canManageField },
      admin: { readOnly: true },
    },
    {
      name: 'decorBlocked',
      type: 'checkbox',
      defaultValue: false,
      label: 'Blocked from decoration prices',
      access: { read: canViewField, create: canManageField, update: canManageField },
      admin: {
        position: 'sidebar',
        description: 'Tick if this account seems to be copying our decoration prices. They still see photos.',
      },
    },
    {
      name: 'marketingConsent',
      type: 'checkbox',
      defaultValue: false,
      label: 'Agreed to offers on WhatsApp / email',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
