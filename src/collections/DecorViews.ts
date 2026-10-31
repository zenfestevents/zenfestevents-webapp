import type { CollectionConfig } from 'payload'

import { hiddenBelow, ownerOnly } from '../access/roles'

/**
 * Which logged-in client saw which decoration's price, per India calendar day. It is both
 * the daily price limit (Decor settings → "Prices per client per day") and an audit trail
 * for spotting accounts that copy the catalog. One row per (client, item, day) — the
 * unique index, not a read-then-write check, keeps repeat views free and counts honest.
 * Written only by lib/decorations.ts.
 */
export const DecorViews: CollectionConfig = {
  slug: 'decor-views',
  labels: { singular: 'Decor price view', plural: 'Decor price views' },
  access: {
    read: ownerOnly,
    create: () => false,
    update: () => false,
    delete: ownerOnly,
  },
  admin: {
    group: 'Decorations',
    useAsTitle: 'day',
    defaultColumns: ['customer', 'item', 'day', 'createdAt'],
    description:
      'Which client saw which decoration price, and when. Someone opening many items every day may be copying prices — tick “Blocked from decoration prices” on their client account.',
    hidden: hiddenBelow('owner'),
  },
  defaultSort: '-createdAt',
  indexes: [{ fields: ['customer', 'item', 'day'], unique: true }],
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
    { name: 'item', type: 'relationship', relationTo: 'decor-items', required: true },
    { name: 'day', type: 'text', required: true, index: true, admin: { description: 'India date, YYYY-MM-DD.' } },
  ],
}
