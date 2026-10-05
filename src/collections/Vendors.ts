import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { adminOrSelf, isAdmin, isAdminField } from '../access'
import {
  CATEGORY_OPTIONS,
  LANGUAGES,
  LISTING_STATUSES,
  PRICE_UNITS,
  toOptionList,
} from '../lib/marketplaceOptions'
import { accountAuth } from './accountAuth'

/** Keeps `startingPrice` (used for sorting and the budget filter) in step with the price card. */
const setStartingPrice: CollectionBeforeChangeHook = ({ data }) => {
  if (Array.isArray(data.priceCard)) {
    const prices = data.priceCard
      .map((row: { price?: number | null }) => Number(row?.price))
      .filter((n: number) => Number.isFinite(n) && n > 0)
    data.startingPrice = prices.length ? Math.min(...prices) : null
  }
  return data
}

/**
 * Vendor accounts for the marketplace — the login and the public listing in one
 * record. Vendors never write here over REST: sign-up and every dashboard edit
 * go through Server Actions (app/(frontend)/vendors/**) that whitelist fields.
 * The public reads listings only through lib/marketplace.ts, which drops the
 * email and phone. A listing appears once the team sets it to "Live".
 */
export const Vendors: CollectionConfig = {
  slug: 'vendors',
  labels: { singular: 'Vendor', plural: 'Vendors' },
  auth: accountAuth({ reset: '/vendors/reset-password', verify: '/vendors/verify-email' }),
  access: {
    read: adminOrSelf('vendors'),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    group: 'Marketplace',
    useAsTitle: 'businessName',
    defaultColumns: ['businessName', 'category', 'listingStatus', 'phone', 'updatedAt'],
    description:
      'Vendor accounts and their marketplace listings. Set "Listing status" to Live to publish one.',
  },
  defaultSort: '-updatedAt',
  hooks: { beforeChange: [setStartingPrice] },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Contact name' },
    { name: 'businessName', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'phone', type: 'text', required: true },
    {
      name: 'phoneVerified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Phone verified on WhatsApp',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      // Set when the account signs in with Google (lib/googleAuth.ts).
      name: 'googleId',
      type: 'text',
      unique: true,
      index: true,
      label: 'Google account ID',
      access: { create: isAdminField, read: isAdminField, update: isAdminField },
      admin: { position: 'sidebar', readOnly: true, description: 'Set when they sign in with Google.' },
    },
    { name: 'category', type: 'select', required: true, options: CATEGORY_OPTIONS },
    {
      name: 'otherService',
      type: 'text',
      label: 'Service offered',
      admin: { condition: (data) => data?.category === 'other' },
    },
    {
      // Free text, checked against MARKET_AREAS by the Server Actions — a text
      // list avoids a Postgres enum migration whenever an area is added.
      name: 'areas',
      type: 'text',
      hasMany: true,
      label: 'Areas served',
    },
    { name: 'about', type: 'textarea' },
    {
      name: 'priceCard',
      type: 'array',
      label: 'Price card',
      labels: { singular: 'Price', plural: 'Prices' },
      fields: [
        { name: 'item', type: 'text', required: true },
        { name: 'unit', type: 'select', required: true, options: toOptionList(PRICE_UNITS) },
        { name: 'price', type: 'number', required: true, min: 0 },
        { name: 'gstIncluded', type: 'checkbox', defaultValue: true, label: 'GST included' },
        { name: 'note', type: 'text' },
      ],
    },
    {
      name: 'startingPrice',
      type: 'number',
      admin: { readOnly: true, position: 'sidebar', description: 'Lowest price on the card.' },
    },
    { name: 'cover', type: 'relationship', relationTo: 'vendor-media' },
    { name: 'gallery', type: 'relationship', relationTo: 'vendor-media', hasMany: true },
    { name: 'instagram', type: 'text', label: 'Instagram / website' },
    {
      name: 'languages',
      type: 'select',
      hasMany: true,
      options: LANGUAGES.map((l) => ({ label: l, value: l.toLowerCase() })),
    },
    {
      name: 'blockedDates',
      type: 'array',
      label: 'Booked / unavailable dates',
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'note', type: 'text' },
      ],
    },
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'vendor-applications',
      label: 'Detailed questionnaire',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'The photo / cake / service questions the vendor answered from the dashboard.',
      },
    },
    {
      name: 'listingStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: toOptionList(LISTING_STATUSES),
      access: { update: isAdminField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      label: 'Note to the vendor',
      access: { update: isAdminField },
      admin: {
        position: 'sidebar',
        description: 'Shown on their dashboard — e.g. what to fix when you set "Needs changes".',
      },
    },
    { name: 'submittedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
  ],
}
