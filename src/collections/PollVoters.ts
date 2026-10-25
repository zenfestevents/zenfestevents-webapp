import type { CollectionConfig } from 'payload'

import { adminHidden, canManage, canView, ownerOnly } from '../access/roles'


/**
 * People who voted on public polls, one row per phone number. A marketing list
 * **only** where `marketingConsent` is ticked — the box is unticked by default on
 * the site, as India's DPDP Act requires. Filter by it before any campaign.
 */
export const PollVoters: CollectionConfig = {
  slug: 'poll-voters',
  labels: { singular: 'Voter', plural: 'Voters' },
  access: {
    read: canView,
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  lockDocuments: false,
  admin: {
    group: 'Polls',
    useAsTitle: 'phone',
    defaultColumns: ['phone', 'phoneVerified', 'marketingConsent', 'votes', 'lastVotedAt', 'createdAt'],
    description: 'Only contact people with “Agreed to updates” ticked.',
    hidden: adminHidden('poll-voters'),
  },
  defaultSort: '-lastVotedAt',
  fields: [
    {
      name: 'phone',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { components: { Cell: '/components/admin/WhatsAppCell#WhatsAppCell' } },
    },
    { name: 'phoneVerified', type: 'checkbox', defaultValue: false, label: 'Verified', index: true },
    { name: 'marketingConsent', type: 'checkbox', defaultValue: false, label: 'Agreed to updates', index: true },
    { name: 'consentAt', type: 'date' },
    { name: 'votes', type: 'number', defaultValue: 0 },
    { name: 'lastVotedAt', type: 'date' },
    { name: 'source', type: 'text', defaultValue: 'polls', admin: { readOnly: true } },
  ],
}
