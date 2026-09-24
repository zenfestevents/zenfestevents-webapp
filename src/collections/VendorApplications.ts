import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { notifySubmission } from '../hooks/notifySubmission'
import { requireVerifiedPhone } from '../hooks/requireVerifiedPhone'
import { syncToAirtable } from '../hooks/syncToAirtable'
import {
  CUSTOM_UNITS,
  MIN_FLAVOURS,
  MIN_ORDERS,
  PHOTO_EDITING,
  PHOTO_SERVICES,
  SURCHARGE_UNITS,
  TIER_UNITS,
  toOptions,
} from '../lib/vendorOptions'

const photoServiceOptions = PHOTO_SERVICES.map(([value, label]) => ({ value, label }))

/**
 * Cake bakers must pass the Airtable intake's hard filters — a 14-digit FSSAI
 * number with its certificate, and delivery to the venue — plus give their
 * flavour rates. The form enforces the same; this stops direct API calls.
 */
const requireCakeBasics: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation !== 'create' || data.vendorType !== 'cake') return data
  const cake = data.cake ?? {}
  const fail = (msg: string) => {
    throw new APIError(msg, 400, null, true)
  }
  if (!/^\d{14}$/.test(String(cake.fssaiNumber ?? ''))) fail('Enter your 14-digit FSSAI number.')
  if (!cake.fssaiCertificate) fail('Upload a photo of your FSSAI certificate.')
  if (!String(cake.deliveryRates ?? '').trim()) fail('Tell us your delivery rates.')
  const flavours = (cake.flavours ?? []).filter(
    (f: { flavour?: string; ratePerKg?: number }) => f.flavour?.trim() && f.ratePerKg,
  )
  if (flavours.length < MIN_FLAVOURS) fail(`List at least ${MIN_FLAVOURS} flavours with their rate per kg.`)
  return data
}

/** Vendor enrollment submissions. Public can create; only admin can manage. */
export const VendorApplications: CollectionConfig = {
  slug: 'vendor-applications',
  labels: { singular: 'Vendor Application', plural: 'Vendor Applications' },
  access: {
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'vendorType', 'phone', 'city', 'status', 'createdAt'],
    description: 'Vendors who want to work with Zenfest Events.',
  },
  defaultSort: '-createdAt',
  hooks: {
    // Validate first; requireVerifiedPhone consumes the one-time proof, so it
    // must run last or a rejected form would burn the vendor's verification.
    beforeChange: [requireCakeBasics, requireVerifiedPhone],
    afterChange: [
      notifySubmission('vendor application', [
        'name',
        'businessName',
        'vendorType',
        'otherService',
        'photography.coverage',
        'photography.specialty',
        'photography.rates',
        'photography.editing',
        'cake.flavours',
        'cake.egglessCharge',
        'cake.egglessUnit',
        'cake.wheatCharge',
        'cake.wheatUnit',
        'cake.tier2kgCharge',
        'cake.tier3kgCharge',
        'cake.tierUnit',
        'cake.customCharge',
        'cake.customUnit',
        'cake.minOrder',
        'cake.leadNormalDays',
        'cake.leadCustomDays',
        'cake.fssaiNumber',
        'cake.deliveryRadiusKm',
        'cake.deliveryRates',
        'cake.venueServing',
        'phone',
        'phoneVerified',
        'city',
        'portfolioUrl',
        'message',
      ]),
      syncToAirtable,
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'businessName',
      type: 'text',
      // Required for new applications only — enforced here rather than with
      // `required`, so older applications without one stay editable and the
      // column needs no NOT NULL migration.
      validate: (value: unknown, { operation }: { operation?: string }) =>
        operation !== 'create' || (typeof value === 'string' && value.trim() !== '')
          ? true
          : 'Business name is required.',
    },
    {
      name: 'vendorType',
      type: 'select',
      required: true,
      // The public form only offers Photography, Cakes and Other. Decoration,
      // Catering and DJ are kept so older applications still validate.
      options: [
        { label: 'Photography & Video', value: 'photography' },
        { label: 'Cakes & Bakes', value: 'cake' },
        { label: 'Decoration', value: 'decoration' },
        { label: 'Catering', value: 'catering' },
        { label: 'DJ / Music', value: 'dj' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'otherService',
      type: 'text',
      label: 'Service offered',
      admin: {
        description: 'What the vendor offers, when they chose "Other".',
        condition: (data) => data?.vendorType === 'other',
      },
    },
    {
      name: 'photography',
      type: 'group',
      label: 'Photography details',
      admin: { condition: (data) => data?.vendorType === 'photography' },
      fields: [
        {
          name: 'coverage',
          type: 'select',
          label: 'How they work',
          options: [
            { label: 'One of the services', value: 'single' },
            { label: 'Takes care of all of them', value: 'all' },
          ],
        },
        {
          name: 'specialty',
          type: 'select',
          label: 'Their service',
          options: photoServiceOptions,
          admin: { condition: (_, sibling) => sibling?.coverage === 'single' },
        },
        {
          name: 'rates',
          type: 'array',
          label: 'Price & camera per service',
          labels: { singular: 'Service', plural: 'Services' },
          fields: [
            { name: 'service', type: 'select', required: true, options: photoServiceOptions },
            {
              name: 'sessionPrice',
              type: 'number',
              label: 'Price per session (₹)',
              admin: { description: '1 session ≈ 5 hours.' },
            },
            { name: 'camera', type: 'text', label: 'Camera model' },
          ],
        },
        {
          name: 'editing',
          type: 'select',
          hasMany: true,
          label: 'Album & editing',
          options: PHOTO_EDITING.map(([value, label]) => ({ value, label })),
        },
      ],
    },
    {
      name: 'cake',
      type: 'group',
      label: 'Cake details',
      // The "Approved 10" intake questions from the Cake Vendors Airtable base.
      // FSSAI (Q8) and delivery (Q9) are hard filters: the form turns bakers
      // without them away, and requireCakeBasics refuses them server-side.
      admin: { condition: (data) => data?.vendorType === 'cake' },
      fields: [
        {
          name: 'flavours',
          type: 'array',
          label: 'Q1 · Flavours and rate per kg',
          labels: { singular: 'Flavour', plural: 'Flavours' },
          fields: [
            { name: 'flavour', type: 'text', required: true },
            { name: 'ratePerKg', type: 'number', label: 'Rate per kg (₹)' },
          ],
        },
        {
          name: 'menu',
          type: 'upload',
          relationTo: 'vendor-uploads',
          label: 'Full menu card (optional)',
        },
        {
          type: 'row',
          fields: [
            { name: 'egglessCharge', type: 'number', label: 'Q2 · Eggless extra (₹)' },
            { name: 'egglessUnit', type: 'select', label: 'Charged', options: toOptions(SURCHARGE_UNITS) },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'wheatCharge', type: 'number', label: 'Q3 · Wheat / atta extra (₹)' },
            { name: 'wheatUnit', type: 'select', label: 'Charged', options: toOptions(SURCHARGE_UNITS) },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'tier2kgCharge', type: 'number', label: 'Q4 · 2 kg tier (₹)' },
            { name: 'tier3kgCharge', type: 'number', label: '3 kg tier (₹)' },
            { name: 'tierUnit', type: 'select', label: 'Charged', options: toOptions(TIER_UNITS) },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'customCharge', type: 'number', label: 'Q5 · Custom theme cake (₹)' },
            { name: 'customUnit', type: 'select', label: 'Charged', options: toOptions(CUSTOM_UNITS) },
          ],
        },
        { name: 'minOrder', type: 'select', label: 'Q6 · Minimum order', options: toOptions(MIN_ORDERS) },
        {
          type: 'row',
          fields: [
            { name: 'leadNormalDays', type: 'number', label: 'Q7 · Notice, normal cake (days)' },
            { name: 'leadCustomDays', type: 'number', label: 'Notice, custom cake (days)' },
          ],
        },
        { name: 'fssaiNumber', type: 'text', label: 'Q8 · FSSAI number (14 digits)' },
        {
          name: 'fssaiCertificate',
          type: 'upload',
          relationTo: 'vendor-uploads',
          label: 'FSSAI certificate',
        },
        {
          type: 'row',
          fields: [
            { name: 'deliveryRadiusKm', type: 'number', label: 'Q9 · Delivers up to (km)' },
            { name: 'deliveryRates', type: 'textarea', label: 'Delivery rate slab' },
          ],
        },
        {
          name: 'venueServing',
          type: 'select',
          label: 'Q10 · Serves at the venue (knife, plates, tissues, candles)',
          options: [
            { label: 'Yes, serves at the venue', value: 'yes' },
            { label: 'No, drop-off only', value: 'no' },
          ],
        },
      ],
    },
    { name: 'phone', type: 'text', required: true },
    {
      name: 'phoneVerified',
      type: 'checkbox',
      label: 'Phone verified on WhatsApp',
      defaultValue: false,
      admin: { position: 'sidebar', readOnly: true },
    },
    // Sent by the form ({ id, token } of a PhoneVerifications record); checked and
    // consumed by requireVerifiedPhone, never stored.
    { name: 'phoneVerification', type: 'json', virtual: true, admin: { hidden: true } },
    // No longer asked on the form; kept for older applications.
    { name: 'email', type: 'email' },
    // Holds the Chennai area picked on the form (column name kept to avoid a migration).
    { name: 'city', type: 'text', label: 'Area' },
    {
      name: 'portfolioUrl',
      type: 'text',
      admin: { description: 'Link to work samples / Instagram / website.' },
    },
    { name: 'message', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
