import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type Where,
} from 'payload'

import { hasRole, hiddenBelow, ownerOnly, ownerOnlyField, ROLES } from '../access/roles'

/**
 * Zenfest's own team (admin/staff logins for /admin). NOT client logins — vendors and
 * couples have their own collections. Each member has a role (access/roles.ts); only the
 * Owner sees this list, adds people and changes roles. Everyone can open their own
 * account (top-right) to change their name or password. The first Owner is made with
 * `npm run create:admin` (the create-first-user screen is broken, see CLAUDE.md).
 */

/** The Owner sees everyone; anyone else only their own record. */
const ownerOrSelf: Access = ({ req }) => {
  if (hasRole(req.user, 'owner')) return true
  if (hasRole(req.user, 'viewer')) return { id: { equals: req.user!.id } } as Where
  return false
}

const activeOwners: Where[] = [{ role: { equals: 'owner' } }, { active: { not_equals: false } }]

/** Never leave the team without an active Owner (nobody could add people any more). */
const keepAnOwner: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !originalDoc) return data
  const wasOwner = originalDoc.role === 'owner' && originalDoc.active !== false
  const role = data.role ?? originalDoc.role
  const active = data.active ?? originalDoc.active
  if (wasOwner && (role !== 'owner' || active === false)) {
    const others = await req.payload.count({
      collection: 'users',
      where: { and: [...activeOwners, { id: { not_equals: originalDoc.id } }] },
      req,
    })
    if (others.totalDocs === 0) {
      throw new APIError('Make someone else an Owner first: the team needs at least one Owner.', 400, null, true)
    }
  }
  return data
}

const keepAnOwnerOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const doc = await req.payload.findByID({ collection: 'users', id, depth: 0, req })
  if (doc.role !== 'owner' || doc.active === false) return
  const others = await req.payload.count({
    collection: 'users',
    where: { and: [...activeOwners, { id: { not_equals: id } }] },
    req,
  })
  if (others.totalDocs === 0) {
    throw new APIError('This is the last Owner and cannot be deleted.', 400, null, true)
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Team member', plural: 'Team' },
  auth: true,
  access: {
    // Switched-off members (and vendors / couples) can't open /admin at all.
    admin: ({ req }) => hasRole(req.user, 'viewer'),
    read: ownerOrSelf,
    create: ownerOnly,
    update: ownerOrSelf,
    delete: ownerOnly,
  },
  admin: {
    group: 'Team',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'active'],
    description:
      'Your team’s logins for this admin. Add a person, give them a role, and share their email + password with them. When someone leaves, untick “Can log in”.',
    hidden: hiddenBelow('owner'),
  },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user.active === false) throw new APIError('This login is switched off. Ask the Owner.', 403, null, true)
        return user
      },
    ],
    beforeChange: [keepAnOwner],
    beforeDelete: [keepAnOwnerOnDelete],
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'phone', type: 'text', label: 'Phone / WhatsApp' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'team',
      options: [...ROLES],
      access: { create: ownerOnlyField, update: ownerOnlyField },
      admin: {
        position: 'sidebar',
        description: 'What this person is allowed to do. Only the Owner can change it.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Can log in',
      defaultValue: true,
      access: { create: ownerOnlyField, update: ownerOnlyField },
      admin: {
        position: 'sidebar',
        description: 'Untick when someone leaves. Their name stays on the work they did.',
      },
    },
  ],
}
