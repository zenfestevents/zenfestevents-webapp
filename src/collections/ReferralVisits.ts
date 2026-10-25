import type { CollectionConfig } from 'payload'

import { adminHidden, ownerOnly } from '../access/roles'


/**
 * "Opened your link": one row per browser per inviter, written by /invite/<code>
 * (lib/rewards.ts recordReferralVisit). Anonymous on purpose — a random visitor id
 * from the `zf_vis` cookie, no name or phone — so the Refer & earn page shows only a
 * count. "Once per browser" is the unique index on (referrer, visitor).
 */
export const ReferralVisits: CollectionConfig = {
  slug: 'referral-visits',
  labels: { singular: 'Invite link visit', plural: 'Invite link visits' },
  access: {
    read: ownerOnly,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  lockDocuments: false,
  admin: {
    group: 'Rewards',
    useAsTitle: 'referrer',
    defaultColumns: ['referrer', 'audience', 'createdAt'],
    description: 'Someone opened an invite link. Anonymous: only who shared the link and when.',
    hidden: adminHidden('referral-visits', 'owner'),
  },
  defaultSort: '-createdAt',
  indexes: [{ fields: ['referrer', 'visitor'], unique: true }],
  fields: [
    {
      name: 'referrer',
      type: 'text',
      required: true,
      index: true,
      admin: { readOnly: true, description: 'Who shared the link: c:<id> = couple, v:<id> = vendor.' },
    },
    { name: 'visitor', type: 'text', required: true, admin: { readOnly: true, description: 'Anonymous browser id.' } },
    {
      name: 'audience',
      type: 'select',
      required: true,
      defaultValue: 'client',
      options: [
        { label: 'Client invite', value: 'client' },
        { label: 'Vendor invite', value: 'vendor' },
      ],
      admin: { readOnly: true },
    },
  ],
}
