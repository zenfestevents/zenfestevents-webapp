import type { CollectionConfig } from 'payload'

import { adminHidden, canManage, canView, ownerOnly } from '../access/roles'
import { GUEST_SIDES, RSVP_OPTIONS, toOptions } from '../lib/registryOptions'

/** A host's invite list and RSVPs, managed from the registry dashboard. */
export const RegistryGuests: CollectionConfig = {
  slug: 'registry-guests',
  labels: { singular: 'Invited guest', plural: 'Invited guests' },
  access: {
    read: canView,
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'Gift Registry',
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'event', 'rsvp', 'count'],
    hidden: adminHidden('registry-guests'),
  },
  defaultSort: 'name',
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'registry-events', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text' },
    { name: 'side', type: 'select', options: toOptions(GUEST_SIDES) },
    { name: 'count', type: 'number', min: 1, defaultValue: 1, label: 'People' },
    { name: 'rsvp', type: 'select', defaultValue: 'pending', options: toOptions(RSVP_OPTIONS) },
    { name: 'invitedAt', type: 'date', label: 'Invite sent' },
  ],
}
