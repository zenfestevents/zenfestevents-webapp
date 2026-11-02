import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type Where,
} from 'payload'

import { isOwner, isStaff, LEVELS, MODULES, ownerHidden, ownerOnly, ownerOnlyField, ROLES } from '../access/roles'

/**
 * Zenfest's own team (admin/staff logins for /admin). NOT client logins — vendors and
 * couples have their own collections. A login is the Owner (everything) or a Team member
 * whose access is set per module (None / Read only / Add & edit / Full, access/roles.ts).
 * Only the Owner sees this list, adds people and changes access. Everyone can open their
 * own account (top-right) to change their name or password. The first Owner is made with
 * `npm run create:admin` (the create-first-user screen is broken, see CLAUDE.md).
 */

/** The Owner sees everyone; anyone else only their own record. */
const ownerOrSelf: Access = ({ req }) => {
  if (isOwner(req.user)) return true
  if (isStaff(req.user)) return { id: { equals: req.user!.id } } as Where
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
    admin: ({ req }) => isStaff(req.user),
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
      'Your team’s logins for this admin. Add a person, choose which modules they can open and what they can do there, and share their email + password with them. When someone leaves, untick “Can log in”.',
    hidden: ownerHidden('users'),
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
      // Only Owner and Team member are offered; an old Manager / Viewer shows until it is changed.
      filterOptions: ({ options, data }) =>
        options.filter((o) => {
          const value = typeof o === 'string' ? o : o.value
          return value === 'owner' || value === 'team' || data?.role === value
        }),
      access: { create: ownerOnlyField, update: ownerOnlyField },
      admin: {
        position: 'sidebar',
        description:
          'Owner can do everything, including this Team list. A Team member can do only what you set under “Access by module”. Only the Owner can change this.',
      },
    },
    {
      // One level per menu group. A member with nothing set has no access to that module.
      name: 'moduleAccess',
      type: 'group',
      label: 'Access by module',
      access: { create: ownerOnlyField, update: ownerOnlyField },
      admin: {
        condition: (data) => data?.role !== 'owner',
        description:
          'Choose what this person can open. None hides the module completely. Read only can look. Add & edit can add and change records but cannot delete, approve vendors, listings or reviews, or send bulk WhatsApp messages. Full can do everything in that module.',
      },
      fields: MODULES.map((m) => ({
        name: m.value,
        type: 'select' as const,
        label: m.label,
        defaultValue: 'none',
        options: LEVELS.map(({ value, label }) => ({ value, label })),
        admin: { description: m.help },
      })),
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
