import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { adminOrSelf } from '../access'
import { adminHidden, canManage, canManageField, canViewField, ownerOnly } from '../access/roles'
import { assignReferralCode, vendorRuns } from '../hooks/runsClub'
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
  labels: { singular: 'Vendor account', plural: 'Vendor accounts' },
  auth: accountAuth({ reset: '/vendors/reset-password', verify: '/vendors/verify-email' }),
  access: {
    read: adminOrSelf('vendors'),
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'Vendors',
    useAsTitle: 'businessName',
    defaultColumns: ['businessName', 'category', 'listingStatus', 'phone', 'updatedAt'],
    description: 'Vendors who log in to the website with WhatsApp. A Manager or the Owner sets “Listing status” to Live to show a listing.',
    hidden: adminHidden('vendors'),
  },
  defaultSort: '-updatedAt',
  hooks: { beforeChange: [setStartingPrice, assignReferralCode], afterChange: [vendorRuns] },
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
      access: { create: canManageField, read: canViewField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true, description: 'Set when they sign in with Google.' },
    },
    {
      // Runs club total — a cache of the sum of this account's `runs` rows (lib/rewards.ts).
      name: 'runs',
      type: 'number',
      defaultValue: 0,
      label: 'Runs',
      access: { create: canManageField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true, description: 'Runs club total. Add a Runs entry to change it.' },
    },
    {
      // Share code for /invite/<code>; set on create, back-filled by the Runs club migration.
      name: 'referralCode',
      type: 'text',
      unique: true,
      index: true,
      access: { create: canManageField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      // `c:<id>` / `v:<id>`: who invited this account (lib/rewards.ts). Set in code from the
      // /invite/<code> cookie, never from the request.
      name: 'referredBy',
      type: 'text',
      label: 'Invited by',
      index: true,
      access: { create: canManageField, update: canManageField },
      admin: { position: 'sidebar', readOnly: true, description: 'c:<id> = couple, v:<id> = vendor.' },
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
    {
      // A city or area slug from lib/locations.ts (text, like `areas`, so adding an area
      // needs no migration). With travelKm it places the vendor on the city/area pages.
      name: 'baseArea',
      type: 'text',
      label: 'Based in',
      admin: { description: 'City or area slug from lib/locations.ts, e.g. guduvanchery.' },
    },
    { name: 'travelKm', type: 'number', min: 1, max: 1000, label: 'Travels up to (km)' },
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
      access: { update: canManageField },
      admin: { position: 'sidebar', components: { Cell: '/components/admin/StatusPill#StatusPill' } },
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      label: 'Note to the vendor',
      access: { update: canManageField },
      admin: {
        position: 'sidebar',
        description: 'Shown on their dashboard — e.g. what to fix when you set "Needs changes".',
      },
    },
    { name: 'submittedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
  ],
}
