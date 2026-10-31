import type { CollectionConfig } from 'payload'

import { canView, ownerOnly } from '../access/roles'

/**
 * Every change to a decoration's client or vendor price (old → new, when, by whom), so a
 * past quote can be checked. Written only by the decor-items hooks; nobody edits it.
 * Holds vendor prices, so staff only. Also shown on each decoration's edit page.
 */
export const DecorPriceHistory: CollectionConfig = {
  slug: 'decor-price-history',
  labels: { singular: 'Price change', plural: 'Price history' },
  access: {
    read: canView,
    create: () => false,
    update: () => false,
    delete: ownerOnly,
  },
  admin: {
    group: 'Decorations',
    useAsTitle: 'itemCode',
    defaultColumns: ['itemCode', 'field', 'oldPrice', 'newPrice', 'changedOn', 'changedBy'],
    listSearchableFields: ['itemCode'],
    description: 'Every price change on a decoration, to check what a past quote was based on. Filled in automatically.',
  },
  defaultSort: '-changedOn',
  fields: [
    { name: 'item', type: 'relationship', relationTo: 'decor-items', required: true, index: true },
    { name: 'itemCode', type: 'text', label: 'Item code', index: true },
    {
      name: 'field',
      type: 'select',
      required: true,
      label: 'Price',
      options: [
        { value: 'client', label: 'Client price' },
        { value: 'vendor', label: 'Vendor price' },
      ],
    },
    {
      name: 'oldPrice',
      type: 'number',
      label: 'Old price ₹',
      admin: { components: { Cell: '/components/admin/decor/MarginCell#DecorRupeesCell' } },
    },
    {
      name: 'newPrice',
      type: 'number',
      label: 'New price ₹',
      admin: { components: { Cell: '/components/admin/decor/MarginCell#DecorRupeesCell' } },
    },
    {
      name: 'changedOn',
      type: 'date',
      required: true,
      index: true,
      label: 'Changed on',
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, h:mm a' } },
    },
    { name: 'changedBy', type: 'relationship', relationTo: 'users', label: 'Changed by' },
  ],
}
