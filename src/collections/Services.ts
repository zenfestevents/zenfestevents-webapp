import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { slugField } from '../fields/slug'

/** Individual services: Decoration, Catering, Photography, DJ, etc. */
export const Services: CollectionConfig = {
  slug: 'services',
  labels: { singular: 'Service', plural: 'Services' },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'featured', 'order'],
  },
  defaultSort: 'order',
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    {
      name: 'summary',
      type: 'text',
      admin: { description: 'One short line shown on cards.' },
    },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      // Zenfest AI: each enabled service becomes a specialist agent that knows only
      // what is entered here (lib/ai/knowledge.ts). Prices are added up in code from
      // these ranges, never by the AI.
      type: 'group',
      name: 'ai',
      label: 'Zenfest AI specialist',
      admin: {
        description:
          'Turn this on to give Zenfest AI a specialist for this service. It only knows what you enter below, so fill in options and price ranges.',
      },
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false, label: 'AI specialist enabled' },
        {
          type: 'row',
          fields: [
            {
              name: 'agentName',
              type: 'text',
              maxLength: 40,
              admin: { width: '60%', description: 'Shown to customers, e.g. "Zenfest Décor".' },
            },
            { name: 'agentEmoji', type: 'text', maxLength: 4, admin: { width: '40%', description: 'e.g. 🎨' } },
          ],
        },
        {
          name: 'persona',
          type: 'textarea',
          maxLength: 600,
          admin: { description: 'How this specialist talks and what it is expert in (a few lines).' },
        },
        {
          name: 'options',
          type: 'array',
          labels: { singular: 'Option', plural: 'Options' },
          admin: { description: 'What customers can choose. The AI may only recommend these.' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'name', type: 'text', required: true, maxLength: 80, admin: { width: '50%' } },
                {
                  name: 'unit',
                  type: 'select',
                  required: true,
                  defaultValue: 'event',
                  options: [
                    { label: 'Per event', value: 'event' },
                    { label: 'Per plate', value: 'plate' },
                    { label: 'Per hour', value: 'hour' },
                    { label: 'Per person', value: 'person' },
                  ],
                  admin: { width: '50%' },
                },
              ],
            },
            { name: 'description', type: 'textarea', maxLength: 400 },
            {
              type: 'row',
              fields: [
                { name: 'priceMin', type: 'number', min: 0, label: 'Price from (₹)', admin: { width: '33%' } },
                { name: 'priceMax', type: 'number', min: 0, label: 'Price up to (₹)', admin: { width: '33%' } },
                { name: 'minQty', type: 'number', min: 0, label: 'Minimum quantity', admin: { width: '33%' } },
              ],
            },
          ],
        },
        {
          name: 'rules',
          type: 'textarea',
          maxLength: 2000,
          admin: { description: 'Facts and limits the AI must respect, e.g. "Minimum 100 plates", "No outdoor fireworks".' },
        },
        {
          name: 'faqs',
          type: 'array',
          labels: { singular: 'FAQ', plural: 'FAQs' },
          fields: [
            { name: 'question', type: 'text', required: true, maxLength: 200 },
            { name: 'answer', type: 'textarea', required: true, maxLength: 800 },
          ],
        },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Highlight on the home page.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers show first.' },
    },
  ],
}
