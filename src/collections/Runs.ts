import { randomBytes } from 'node:crypto'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { isAdmin } from '../access'
import { kindOfCollection, recomputeRuns } from '../lib/rewards'
import { RUNS_REASONS, accountKey, parseAccountKey } from '../lib/rewardTiers'

type AccountRef = { relationTo?: string; value?: number | string | { id: number | string } } | null | undefined

/** Fills `accountKey` from the picked account, and a one-off `source` for staff's manual rows. */
const fillKeys: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  const ref = (data.account ?? originalDoc?.account) as AccountRef
  const kind = kindOfCollection(ref?.relationTo)
  const id = typeof ref?.value === 'object' ? ref?.value?.id : ref?.value
  if (kind && id != null) data.accountKey = accountKey(kind, id)
  if (!data.accountKey && !originalDoc?.accountKey) {
    throw new ValidationError({ errors: [{ message: 'Choose the couple or vendor.', path: 'account' }] })
  }
  if ((data.reason ?? originalDoc?.reason) === 'manual' && !(data.source ?? originalDoc?.source)) {
    data.source = `manual:${randomBytes(6).toString('hex')}`
  }
  return data
}

// Staff adding, editing or deleting a row keeps the account's total right. Awards
// made in code pass `skipRuns` and recompute themselves.
const totalAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context.skipRuns) return doc
  const keys = new Set([doc.accountKey, previousDoc?.accountKey].filter(Boolean))
  for (const key of keys) {
    const acc = parseAccountKey(key)
    if (acc) await recomputeRuns(req.payload, acc.kind, acc.id, req)
  }
  return doc
}

const totalAfterDelete: CollectionAfterDeleteHook = async ({ doc, req, context }) => {
  if (context.skipRuns) return doc
  const acc = parseAccountKey(doc.accountKey)
  if (acc) await recomputeRuns(req.payload, acc.kind, acc.id, req)
  return doc
}

/**
 * The Runs club ledger: one row per award to a couple or vendor (lib/rewards.ts).
 * "Each award once" is the compound unique index on (accountKey, reason, source),
 * like `poll-votes` — don't replace it with a read-then-write check. Staff can add
 * `manual` rows (bonus or correction, negative to take runs away).
 */
export const Runs: CollectionConfig = {
  slug: 'runs',
  labels: { singular: 'Runs entry', plural: 'Runs' },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  lockDocuments: false,
  admin: {
    group: 'Rewards',
    useAsTitle: 'accountKey',
    defaultColumns: ['account', 'amount', 'reason', 'source', 'createdAt'],
    description:
      'Every award of runs. To give a bonus or correct a total, add a row with reason "Added by the Zenfest team".',
  },
  defaultSort: '-createdAt',
  indexes: [{ fields: ['accountKey', 'reason', 'source'], unique: true }],
  hooks: {
    beforeValidate: [fillKeys],
    afterChange: [totalAfterChange],
    afterDelete: [totalAfterDelete],
  },
  fields: [
    {
      name: 'account',
      type: 'relationship',
      relationTo: ['customers', 'vendors'],
      required: true,
      label: 'Couple or vendor',
    },
    {
      name: 'accountKey',
      type: 'text',
      index: true,
      admin: { readOnly: true, description: 'c:<id> for a couple, v:<id> for a vendor. Filled in automatically.' },
    },
    { name: 'amount', type: 'number', required: true, admin: { description: 'Negative takes runs away.' } },
    {
      name: 'reason',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: RUNS_REASONS.map((r) => ({ label: r.label, value: r.value })),
    },
    {
      name: 'source',
      type: 'text',
      admin: { readOnly: true, description: 'What it was for, e.g. lead:42 or enquiry:7.' },
    },
    { name: 'note', type: 'text' },
  ],
}
