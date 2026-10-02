import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'

/**
 * Zenfest AI chats (lib/ai/*, /plan/chat). Admin-only over REST: the chat route and
 * Server Actions use the Local API. `messages` is the exact Claude API history and is
 * only ever appended to; `transcript` is the same chat as the customer saw it, which
 * is what to read when checking what the AI said.
 */
export const AiConversations: CollectionConfig = {
  slug: 'ai-conversations',
  labels: { singular: 'AI chat', plural: 'Zenfest AI chats' },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Zenfest AI',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'turns', 'lead', 'updatedAt'],
    description: 'Every Zenfest AI conversation. Open one to read what the customer and the agents said.',
  },
  defaultSort: '-updatedAt',
  fields: [
    { name: 'title', type: 'text', admin: { description: 'The customer’s first message.' } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Lead saved', value: 'lead' },
        { label: 'Handed to team', value: 'handed-off' },
        { label: 'Stopped (limit reached)', value: 'capped' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'lead', type: 'relationship', relationTo: 'leads', admin: { position: 'sidebar' } },
    { name: 'leadNotified', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
    { name: 'turns', type: 'number', defaultValue: 0, admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'brief',
      type: 'json',
      admin: { description: 'Event basics gathered so far (type, date, area, guests, budget).' },
    },
    { name: 'transcript', type: 'json', admin: { description: 'The chat as the customer saw it.' } },
    { name: 'specialistResults', type: 'json', admin: { description: 'Latest card from each specialist.' } },
    { name: 'messages', type: 'json', admin: { hidden: true } },
    {
      type: 'group',
      name: 'usage',
      admin: { position: 'sidebar' },
      fields: [
        { name: 'inputTokens', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'outputTokens', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'cacheReadTokens', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'costUsd', type: 'number', defaultValue: 0, label: 'Cost (USD)', admin: { readOnly: true } },
      ],
    },
    { name: 'tokenHash', type: 'text', required: true, admin: { hidden: true } },
    { name: 'ipHash', type: 'text', admin: { hidden: true } },
  ],
}
