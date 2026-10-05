import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { isAdmin } from '../access'
import { slugify } from '../lib/formCheck'
import { LISTING_STATUSES, toOptionList } from '../lib/marketplaceOptions'
import {
  PRODUCT_SOURCES,
  PRODUCT_TYPES,
  SHIPS_TO,
  SHOP_OCCASIONS,
  isOccasion,
  merchantFromUrl,
} from '../lib/shopOptions'

/** Fills the slug from the title and the store name from the affiliate link. */
const fillDerived: CollectionBeforeChangeHook = ({ data }) => {
  if (!data.slug && data.title) data.slug = `${slugify(String(data.title))}-${Date.now().toString(36).slice(-4)}`
  if (data.affiliateUrl && !data.merchant) data.merchant = merchantFromUrl(String(data.affiliateUrl))
  return data
}

/**
 * The Zenfest Shop catalogue — event-only products. Each product says who sells
 * it (`source`): a partner store via an affiliate link, a marketplace vendor, or
 * (after GST) Zenfest itself. Admin-only over REST; the public reads published
 * products through lib/shop.ts, the privacy boundary.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Product', plural: 'Products' },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    group: 'Shop',
    useAsTitle: 'title',
    defaultColumns: ['title', 'source', 'price', 'status', 'updatedAt'],
    description: 'Event products in the Zenfest Shop. Set "Status" to Live to show one on the site.',
  },
  defaultSort: 'sortOrder',
  hooks: { beforeChange: [fillDerived] },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Web address. Filled from the title if left empty.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: toOptionList(LISTING_STATUSES),
      admin: { position: 'sidebar' },
    },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'affiliate',
      label: 'Sold by',
      options: toOptionList(PRODUCT_SOURCES),
    },
    {
      // Text, checked against SHOP_OCCASIONS — no enum migration when one is added.
      name: 'occasions',
      type: 'text',
      hasMany: true,
      required: true,
      admin: { description: SHOP_OCCASIONS.map(([v]) => v).join(', ') },
      validate: (value: unknown) =>
        Array.isArray(value) && value.length > 0 && value.every(isOccasion)
          ? true
          : `Use one or more of: ${SHOP_OCCASIONS.map(([v]) => v).join(', ')}`,
    },
    { name: 'productType', type: 'select', required: true, label: 'Type', options: toOptionList(PRODUCT_TYPES) },
    {
      type: 'row',
      fields: [
        { name: 'price', type: 'number', required: true, min: 0, label: 'Price (₹)' },
        { name: 'mrp', type: 'number', min: 0, label: 'MRP (₹, optional)' },
      ],
    },
    { name: 'description', type: 'textarea' },
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true, label: 'Photos' },
    {
      name: 'imageUrl',
      type: 'text',
      label: 'Photo link (if no upload)',
      admin: { description: 'https:// link to the product photo, e.g. from the partner store.' },
    },
    {
      type: 'collapsible',
      label: 'Partner store',
      admin: { condition: (data) => data?.source === 'affiliate' },
      fields: [
        { name: 'affiliateUrl', type: 'text', label: 'Product link on the store' },
        { name: 'merchant', type: 'text', label: 'Store name', admin: { description: 'Filled from the link.' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Seller',
      admin: { condition: (data) => data?.source === 'seller' },
      fields: [
        { name: 'vendor', type: 'relationship', relationTo: 'vendors', index: true },
        { name: 'sellerImages', type: 'upload', relationTo: 'vendor-media', hasMany: true, label: 'Seller photos' },
        { name: 'shipsTo', type: 'select', defaultValue: 'state', options: toOptionList(SHIPS_TO) },
        { name: 'dispatchDays', type: 'number', min: 0, label: 'Ships within (days)' },
        { name: 'stock', type: 'number', min: 0, label: 'In stock (blank = made to order)' },
        { name: 'returnPolicy', type: 'textarea', label: 'Returns & refunds' },
      ],
    },
  ],
}
