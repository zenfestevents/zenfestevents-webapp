import type { GlobalConfig } from 'payload'

import { canManage, canView } from '../access/roles'

/** Settings for the public Decoration catalog's price protection (lib/decorations.ts). */
export const DecorSettings: GlobalConfig = {
  slug: 'decor-settings',
  label: 'Decoration settings',
  access: { read: canView, update: canManage },
  admin: {
    group: 'Decorations',
    description: 'How many decoration prices one logged-in client may see per day, and how wide price ranges are.',
  },
  fields: [
    {
      name: 'stageCost',
      type: 'number',
      min: 0,
      max: 10_000_000,
      label: 'Stage cost ₹ (when the venue has no stage)',
      admin: {
        step: 1000,
        description:
          'Stage decoration pages ask “Does your venue already have a stage?”. If the client says no, they see “Stage setup is extra: from ₹ this amount”. Leave empty to show “Stage is charged separately” without a number.',
      },
    },
    {
      name: 'dailyPriceLimit',
      type: 'number',
      required: true,
      defaultValue: 40,
      min: 0,
      max: 1000,
      label: 'Prices per client per day',
      admin: {
        description:
          'Different decorations one logged-in client can see prices for each day. After that the site asks them to WhatsApp us. Seeing the same item again is free.',
      },
    },
    {
      name: 'rangeSpreadPercent',
      type: 'number',
      required: true,
      defaultValue: 15,
      min: 5,
      max: 50,
      label: 'Price range width (%)',
      admin: {
        description:
          'Only for items set to “Price range”: how far below and above the client price the range goes, before rounding.',
      },
    },
  ],
}
