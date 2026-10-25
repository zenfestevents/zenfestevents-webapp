import type { CollectionConfig } from 'payload'

import { adminHidden, canManage, canView, ownerOnly } from '../access/roles'


/**
 * One row per vote. "One person, one vote" is the compound unique index on
 * (poll, voterKey): `p:<voterId>` for public polls, `d:<deviceId>` for family
 * event polls. Concurrent double votes are rejected by the database, the same
 * way registry claims are — don't replace it with a read-then-write check.
 */
export const PollVotes: CollectionConfig = {
  slug: 'poll-votes',
  labels: { singular: 'Vote', plural: 'Votes' },
  access: {
    read: canView,
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  lockDocuments: false,
  admin: {
    group: 'Polls',
    defaultColumns: ['poll', 'optionId', 'voter', 'verified', 'createdAt'],
    hidden: adminHidden('poll-votes'),
  },
  defaultSort: '-createdAt',
  indexes: [{ fields: ['poll', 'voterKey'], unique: true }],
  fields: [
    { name: 'poll', type: 'relationship', relationTo: 'polls', required: true, index: true },
    { name: 'optionId', type: 'text', required: true, index: true },
    { name: 'voterKey', type: 'text', required: true },
    { name: 'voter', type: 'relationship', relationTo: 'poll-voters' },
    { name: 'verified', type: 'checkbox', defaultValue: false, index: true },
  ],
}
