import type { CollectionConfig } from 'payload'

import { authenticated } from '../access'

/**
 * Every message on the WhatsApp Cloud API number, both ways. Incoming ones and
 * delivery statuses arrive through Meta's webhook (lib/whatsapp/inbox.ts);
 * outgoing ones are saved by campaigns and staff replies. Read-only in the admin.
 */
export const WhatsAppMessages: CollectionConfig = {
  slug: 'whatsapp-messages',
  labels: { singular: 'WhatsApp Message', plural: 'WhatsApp Messages' },
  access: {
    create: () => false,
    read: authenticated,
    update: () => false,
    delete: authenticated,
  },
  admin: {
    group: 'WhatsApp',
    useAsTitle: 'text',
    defaultColumns: ['at', 'direction', 'phone', 'contact', 'text', 'status'],
    listSearchableFields: ['phone', 'text'],
    description: 'Messages to and from the WhatsApp Cloud API number. Open a WhatsApp Contact to read a whole chat and reply.',
  },
  defaultSort: '-at',
  fields: [
    {
      name: 'direction',
      type: 'select',
      required: true,
      options: [
        { label: '⬅ Received', value: 'in' },
        { label: '➡ Sent', value: 'out' },
      ],
    },
    { name: 'phone', type: 'text', required: true, index: true },
    { name: 'contact', type: 'relationship', relationTo: 'whatsapp-contacts', index: true },
    { name: 'type', type: 'text', defaultValue: 'text' },
    { name: 'text', type: 'textarea' },
    { name: 'waMessageId', type: 'text', unique: true, index: true, label: 'WhatsApp message id' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Received', value: 'received' },
        { label: 'Sent', value: 'sent' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Read', value: 'read' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    { name: 'error', type: 'text' },
    { name: 'campaign', type: 'relationship', relationTo: 'whatsapp-campaigns', index: true },
    { name: 'sentBy', type: 'relationship', relationTo: 'users' },
    {
      name: 'at',
      type: 'date',
      required: true,
      index: true,
      label: 'Time',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
