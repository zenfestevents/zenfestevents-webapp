import type { CollectionConfig, FieldAccess } from 'payload'

import { canView, canViewField, canWork, ownerOnly } from '../access/roles'
import { assignItemCode, recordPriceHistory, stampPriceChange } from '../hooks/decorPrices'
import {
  DECOR_CATEGORIES,
  DECOR_EVENT_TYPES,
  DECOR_KINDS,
  DECOR_PRICE_MODES,
  DECOR_STATUSES,
  DECOR_THEMES,
  decorOptions,
  marginOf,
} from '../lib/decorOptions'

/** Only fields the server works out itself. */
const noOne: FieldAccess = () => false

/** Hide what the server fills in until the item has been saved once. */
const onceSaved = (data: Record<string, unknown> | undefined) => Boolean(data?.id)

/** "Required before this goes Active": drafts from Quick add may leave it empty. */
const neededWhenActive =
  (message: string) =>
  (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
    const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0)
    return siblingData?.status === 'active' && empty ? message : true
  }

/**
 * The Decoration catalog: one record per decoration (or package), with photos and prices
 * collected from suppliers.
 *
 * PRIVACY: the vendor (cost) price, the supplier, the notes and the margin are for the
 * team only. The whole collection is staff-only over REST and GraphQL (`read: canView`),
 * and those fields carry their own staff-only read rule as a second wall. The website
 * reads items only through `lib/decorations.ts`, which copies out the public fields.
 *
 * Archive instead of deleting (only the Owner can delete): old quotes refer to item codes.
 */
export const DecorItems: CollectionConfig = {
  slug: 'decor-items',
  labels: { singular: 'Decoration', plural: 'Decorations' },
  access: {
    read: canView,
    create: canWork,
    update: canWork,
    delete: ownerOnly,
  },
  admin: {
    group: 'Decorations',
    useAsTitle: 'title',
    defaultColumns: ['photos', 'itemCode', 'title', 'eventType', 'category', 'clientPrice', 'margin', 'status'],
    listSearchableFields: ['itemCode', 'title', 'size', 'includes'],
    pagination: { defaultLimit: 25 },
    description:
      'Decorations with photos and prices. Search by code or title, or use the filters. To take one off the website, set Status to Archived — don’t delete it.',
    components: {
      beforeListTable: ['/components/admin/decor/QuickFilters#DecorQuickFilters'],
    },
  },
  defaultSort: '-updatedAt',
  hooks: {
    beforeChange: [assignItemCode, stampPriceChange],
    afterChange: [recordPriceHistory],
  },
  fields: [
    {
      name: 'photos',
      type: 'upload',
      relationTo: 'decor-photos',
      hasMany: true,
      label: 'Photos',
      admin: {
        description: 'The first photo is the cover. Drag to reorder.',
        components: { Cell: '/components/admin/decor/CoverCell#DecorCoverCell' },
      },
      validate: neededWhenActive('Add at least one photo before making this Active.'),
    },
    {
      name: 'title',
      type: 'text',
      maxLength: 140,
      admin: { description: 'What a client sees, e.g. “Peacock stage with jasmine strings”.' },
      validate: neededWhenActive('Add a title before making this Active.'),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'eventType',
          type: 'select',
          required: true,
          label: 'Event type',
          options: decorOptions(DECOR_EVENT_TYPES),
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          options: decorOptions(DECOR_CATEGORIES),
        },
      ],
    },
    {
      name: 'themes',
      type: 'select',
      hasMany: true,
      label: 'Theme / style',
      options: decorOptions(DECOR_THEMES),
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'item',
      label: 'Single item or package',
      options: decorOptions(DECOR_KINDS),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'clientPrice',
          type: 'number',
          min: 0,
          max: 100_000_000,
          label: 'Client price ₹',
          admin: {
            step: 500,
            description: 'What we quote the client.',
            components: { Cell: '/components/admin/decor/MarginCell#DecorRupeesCell' },
          },
          validate: neededWhenActive('Add the client price before making this Active.'),
        },
        {
          name: 'vendorPrice',
          type: 'number',
          min: 0,
          max: 100_000_000,
          label: 'Vendor price ₹ (team only)',
          access: { read: canViewField },
          admin: {
            step: 500,
            description: 'Never shown on the website or in client exports.',
            components: { Cell: '/components/admin/decor/MarginCell#DecorRupeesCell' },
          },
        },
      ],
    },
    {
      name: 'publicDisplay',
      type: 'select',
      required: true,
      defaultValue: 'range',
      label: 'Price on the website',
      options: decorOptions(DECOR_PRICE_MODES),
      admin: { description: 'Prices are shown only to logged-in clients, a few dozen items a day each.' },
    },
    {
      name: 'supplier',
      type: 'relationship',
      relationTo: 'decor-suppliers',
      label: 'Supplier (team only)',
      access: { read: canViewField },
    },
    { name: 'size', type: 'text', maxLength: 200, label: 'Size', admin: { description: 'e.g. 20 ft × 10 ft stage' } },
    { name: 'includes', type: 'textarea', maxLength: 2000, label: 'What’s included' },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 600,
      label: 'Short description (website and client PDFs)',
    },
    { name: 'notes', type: 'textarea', maxLength: 4000, label: 'Notes (team only)', access: { read: canViewField } },
    // ── Sidebar ────────────────────────────────────────────────────────────────
    {
      name: 'itemCode',
      type: 'text',
      unique: true,
      index: true,
      label: 'Item code',
      access: { create: noOne, update: noOne },
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: onceSaved,
        description: 'Given automatically when saved. Quote it to clients.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: decorOptions(DECOR_STATUSES),
      admin: {
        position: 'sidebar',
        description: 'Draft: not on the website yet. Active: on the website. Archived: hidden, kept for old quotes.',
        components: { Cell: '/components/admin/StatusPill#StatusPill' },
      },
    },
    {
      // Virtual: client price − vendor price, for the team only.
      name: 'margin',
      type: 'number',
      virtual: true,
      label: 'Margin ₹',
      access: { create: noOne, read: canViewField, update: noOne },
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: onceSaved,
        description: 'Client price − vendor price. Team only.',
        components: { Cell: '/components/admin/decor/MarginCell#DecorMarginCell' },
      },
      hooks: {
        afterRead: [({ siblingData }) => marginOf(siblingData?.clientPrice, siblingData?.vendorPrice)],
      },
    },
    {
      name: 'priceUpdatedOn',
      type: 'date',
      label: 'Price updated on',
      access: { create: noOne, update: noOne },
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: onceSaved,
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
      },
    },
    {
      name: 'validTill',
      type: 'date',
      label: 'Price valid till (optional)',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: 'Web address',
      access: { update: noOne },
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: onceSaved,
        description: 'Set from the title and code when first saved.',
      },
    },
    {
      name: 'priceHistory',
      type: 'join',
      collection: 'decor-price-history',
      on: 'item',
      label: 'Price history (team only)',
      access: { read: canViewField },
      defaultSort: '-changedOn',
      admin: {
        allowCreate: false,
        condition: onceSaved,
        defaultColumns: ['field', 'oldPrice', 'newPrice', 'changedOn', 'changedBy'],
      },
    },
  ],
}
