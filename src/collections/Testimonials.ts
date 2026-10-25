import type { Access, CollectionConfig } from 'payload'

import { adminHidden, canManage, canManageField, ownerOnly } from '../access/roles'
import { CONTENT_TAGS } from '../lib/contentCache'
import { revalidateCollection } from '../hooks/revalidateContent'
import { TESTIMONIAL_EVENTS } from '../lib/testimonialOptions'

/** The public reads published reviews only; staff see everything. */
const readPublished: Access = ({ req }) =>
  req.user?.collection === 'users' ? true : { published: { equals: true } }

/**
 * What clients say (/testimonials, the homepage strip, "About Zenfest" menu). Most come
 * from the Google Business listing, copied word for word by `npm run import:reviews`
 * (2026-10-22); staff add new ones here. Never edit a review's words or stars.
 */
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  hooks: revalidateCollection(CONTENT_TAGS.testimonials),
  labels: { singular: 'Review', plural: 'Reviews' },
  access: {
    read: readPublished,
    create: canManage,
    update: canManage,
    delete: ownerOnly,
  },
  admin: {
    group: 'Website',
    useAsTitle: 'name',
    defaultColumns: ['name', 'rating', 'eventType', 'published', 'featured'],
    description: 'Client reviews shown on the website. Copy them exactly as written. Untick “Published” to hide one.',
    hidden: adminHidden('testimonials'),
  },
  defaultSort: '-date',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'As it appears on Google. The site shows the first name and an initial.' },
    },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5, admin: { step: 1 } },
    { name: 'text', type: 'textarea', required: true, label: 'Review' },
    {
      name: 'eventType',
      type: 'select',
      label: 'Event',
      options: TESTIMONIAL_EVENTS.map(([value, label]) => ({ value, label })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'date',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'When it was written (for imported Google reviews, worked out from "2 months ago").',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'direct',
      options: [
        { label: 'Google review', value: 'google' },
        { label: 'Sent to us directly', value: 'direct' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: true,
      access: { update: canManageField },
      admin: { position: 'sidebar', description: 'Ticked = shown on the website. Only a Manager or the Owner can change it.' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Show on the home page (the first three are used).' },
    },
  ],
}
