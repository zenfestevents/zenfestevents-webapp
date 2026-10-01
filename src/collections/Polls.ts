import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'
import { POLL_CATEGORIES, POLL_SLUG_PATTERN, RESULTS_VISIBILITY, toOptions } from '../lib/pollOptions'
import { slugify } from '../lib/registryOptions'

/**
 * Polls. Public polls (no `registryEvent`) are made by the team here and shown at
 * /polls; family "event polls" are made from a registry dashboard and shown on
 * that registry. Pages read polls through `lib/polls.ts` (Local API), so the
 * REST API stays admin-only.
 */
export const Polls: CollectionConfig = {
  slug: 'polls',
  labels: { singular: 'Poll', plural: 'Polls' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Polls',
    useAsTitle: 'question',
    defaultColumns: ['question', 'category', 'status', 'closesAt', 'featured', 'registryEvent'],
    description:
      'Open a poll by setting Status to Open. It closes by itself at “Closes at”. Event polls (with a registry) are managed by the family.',
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.question) {
          const base = slugify(data.question).slice(0, 60).replace(/-+$/, '') || 'poll'
          data.slug = `${base}-${Date.now().toString(36).slice(-4)}`
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'question', type: 'text', required: true, maxLength: 200 },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: 'Address (/polls/…)',
      admin: { description: 'Filled in automatically from the question if left blank.' },
      validate: (value: string | null | undefined) =>
        !value || POLL_SLUG_PATTERN.test(value) || 'Use lowercase letters, numbers and hyphens.',
    },
    { name: 'category', type: 'select', required: true, options: toOptions(POLL_CATEGORIES) },
    { name: 'description', type: 'textarea', maxLength: 600 },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'options',
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 8,
      labels: { singular: 'Option', plural: 'Options' },
      fields: [{ name: 'label', type: 'text', required: true, maxLength: 120 }],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft (hidden)', value: 'draft' },
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'closesAt',
      type: 'date',
      label: 'Closes at',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, h:mm a' },
        description: 'Leave blank to keep it open until you close it.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Shown at the top of /polls and on the homepage.' },
    },
    {
      name: 'resultsVisibility',
      type: 'select',
      defaultValue: 'after-vote',
      label: 'Show results',
      options: toOptions(RESULTS_VISIBILITY),
      admin: { position: 'sidebar' },
    },
    {
      name: 'requireVerified',
      type: 'checkbox',
      defaultValue: true,
      label: 'Voters must verify their phone',
      admin: {
        position: 'sidebar',
        description: 'Only applies once phone verification is live. Event polls never ask.',
      },
    },
    {
      name: 'electionSensitive',
      type: 'checkbox',
      defaultValue: false,
      label: 'Election-related',
      admin: {
        position: 'sidebar',
        description:
          'Hides results while open and shows an “opinion poll, not a prediction” note. Close it during the Election Commission’s silence period.',
      },
    },
    {
      name: 'registryEvent',
      type: 'relationship',
      relationTo: 'registry-events',
      index: true,
      label: 'Family registry (event polls only)',
      admin: { position: 'sidebar' },
    },
    {
      type: 'collapsible',
      label: 'Sponsor & call to action',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'sponsor',
          type: 'group',
          fields: [
            { name: 'name', type: 'text' },
            { name: 'logo', type: 'upload', relationTo: 'media' },
            { name: 'url', type: 'text' },
          ],
        },
        {
          name: 'cta',
          type: 'group',
          label: 'Zenfest call to action',
          admin: { description: 'Shown after voting. Blank = the default for the category.' },
          fields: [
            { name: 'text', type: 'text' },
            { name: 'label', type: 'text', label: 'Button' },
            { name: 'href', type: 'text', label: 'Link' },
          ],
        },
      ],
    },
  ],
}
