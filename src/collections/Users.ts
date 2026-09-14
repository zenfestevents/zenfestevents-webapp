import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'

/**
 * Admin/staff accounts for Zenfest Events. These are NOT client logins — they
 * are the business owner and team who manage content and view leads. Create
 * the first user via the /admin panel on first run.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Admin User', plural: 'Admin Users' },
  auth: true,
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email'],
  },
  fields: [{ name: 'name', type: 'text' }],
}
