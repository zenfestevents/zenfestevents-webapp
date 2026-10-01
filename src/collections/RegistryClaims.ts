import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'

/**
 * "I'll gift this" claims. The unique index on `item` is what makes a claim
 * duplicate-proof: two guests tapping at the same moment both try to insert,
 * the database accepts one and rejects the other. Don't replace this with an
 * `isClaimed` flag on the item — a read-then-write flag can race.
 *
 * Who claimed what is private: guests never see it, and the host only sees it
 * after turning on reveal mode (`registry-events.revealClaims`).
 */
export const RegistryClaims: CollectionConfig = {
  slug: 'registry-claims',
  labels: { singular: 'Gift claim', plural: 'Gift claims' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Gift Registry',
    useAsTitle: 'guestName',
    defaultColumns: ['guestName', 'item', 'event', 'mode', 'createdAt'],
    description: 'Delete a claim to make the gift available again.',
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'item',
      type: 'relationship',
      relationTo: 'registry-items',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'event', type: 'relationship', relationTo: 'registry-events', required: true, index: true },
    { name: 'guestName', type: 'text', required: true },
    { name: 'message', type: 'textarea' },
    {
      name: 'mode',
      type: 'select',
      defaultValue: 'online',
      options: [
        { label: 'Buying online (via our link)', value: 'online' },
        { label: 'Buying from a shop', value: 'offline' },
      ],
    },
    {
      // Lets the guest undo their own claim for a short while, from the same browser.
      name: 'undoTokenHash',
      type: 'text',
      admin: { hidden: true },
      access: { read: () => false, update: () => false },
    },
  ],
}
