import type { ArrayField, GlobalConfig } from 'payload'

import { isAdmin } from '../access'
import {
  AWARD_REASONS,
  DEFAULT_COUPLE_TIERS,
  DEFAULT_RUNS_PER,
  DEFAULT_VENDOR_TIERS,
  reasonLabel,
  type RewardTier,
} from '../lib/rewardTiers'

const tiers = (name: string, label: string, defaults: RewardTier[]): ArrayField => ({
  name,
  type: 'array',
  label,
  labels: { singular: 'Tier', plural: 'Tiers' },
  defaultValue: defaults,
  admin: { initCollapsed: true },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
        { name: 'minRuns', type: 'number', required: true, min: 0, label: 'From (runs)', admin: { width: '30%' } },
        { name: 'rupeesOff', type: 'number', min: 0, defaultValue: 0, label: '₹ off', admin: { width: '30%' } },
      ],
    },
    { name: 'perks', type: 'textarea', admin: { rows: 2 } },
  ],
})

/**
 * Runs club settings (lib/rewards.ts): runs per action and the tiers they unlock.
 * Blank or missing values fall back to the defaults in lib/rewardTiers.ts.
 * Runs are loyalty points: never sold, no cash value. Staff honour a tier's ₹ off
 * by hand when quoting. Tier names use generic cricket words only — no league,
 * team, player or stadium names (see DESIGN.md).
 */
export const RewardSettings: GlobalConfig = {
  slug: 'reward-settings',
  label: 'Runs Club Settings',
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  admin: {
    group: 'Rewards',
    description: 'How many runs each action earns and what each tier unlocks. 0 switches an action off.',
  },
  fields: [
    {
      type: 'group',
      name: 'runsPer',
      label: 'Runs per action',
      fields: [
        {
          type: 'row',
          fields: AWARD_REASONS.map((reason) => ({
            name: reason,
            type: 'number' as const,
            label: reasonLabel(reason),
            min: 0,
            defaultValue: DEFAULT_RUNS_PER[reason],
            admin: { width: '25%', placeholder: String(DEFAULT_RUNS_PER[reason]) },
          })),
        },
      ],
    },
    tiers('coupleTiers', 'Couple tiers', DEFAULT_COUPLE_TIERS),
    tiers('vendorTiers', 'Vendor tiers', DEFAULT_VENDOR_TIERS),
  ],
}
