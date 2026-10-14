import type { GlobalConfig } from 'payload'

import { authenticated } from '../access'
import { DEFAULT_CLIENT_MESSAGE, DEFAULT_LEAD_MESSAGE, MESSAGE_PLACEHOLDERS } from '../lib/occasions/message'
import { DEFAULT_LEAD_DAYS, OCCASION_TYPES } from '../lib/occasions/options'

/**
 * Settings for occasion reminders. Blank fields fall back to the defaults in
 * code (`getReminderSettings` in lib/occasions/server.ts), so an empty global
 * still works.
 */
export const ReminderSettings: GlobalConfig = {
  slug: 'reminder-settings',
  label: 'Reminder Settings',
  access: {
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Occasion Reminders',
    description: 'How early reminders are created, the WhatsApp message text and the daily email.',
  },
  fields: [
    {
      type: 'group',
      name: 'leadDays',
      label: 'Remind this many days before',
      fields: [
        {
          type: 'row',
          fields: OCCASION_TYPES.map((t) => ({
            name: t.value,
            type: 'number' as const,
            label: t.label,
            min: 1,
            max: 90,
            admin: { width: '25%', placeholder: String(DEFAULT_LEAD_DAYS[t.value]) },
          })),
        },
      ],
    },
    {
      type: 'group',
      name: 'messages',
      label: 'WhatsApp message',
      admin: {
        description: `Placeholders: ${MESSAGE_PLACEHOLDERS} (and {whose_cap} to start a sentence). {whose} is "your" or e.g. "Aarav's". Changing these affects new reminders only.`,
      },
      fields: [
        {
          name: 'client',
          type: 'textarea',
          label: 'To past clients',
          admin: { placeholder: DEFAULT_CLIENT_MESSAGE, rows: 7, description: 'Blank = the default shown.' },
        },
        {
          name: 'lead',
          type: 'textarea',
          label: 'To leads / cold contacts',
          admin: { placeholder: DEFAULT_LEAD_MESSAGE, rows: 7, description: 'Blank = the default shown.' },
        },
        {
          name: 'overrides',
          type: 'array',
          label: 'Special messages for one occasion type',
          labels: { singular: 'Special message', plural: 'Special messages' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'occasionType', type: 'select', required: true, options: [...OCCASION_TYPES], admin: { width: '50%' } },
                {
                  name: 'audience',
                  type: 'select',
                  required: true,
                  defaultValue: 'any',
                  options: [
                    { label: 'Clients and leads', value: 'any' },
                    { label: 'Clients only', value: 'client' },
                    { label: 'Leads only', value: 'lead' },
                  ],
                  admin: { width: '50%' },
                },
              ],
            },
            { name: 'message', type: 'textarea', required: true },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'digest',
      label: 'Daily email to the team',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Send the 9 AM list of reminders to send' },
        {
          name: 'recipients',
          type: 'text',
          admin: { description: 'Comma-separated emails. Blank = LEAD_NOTIFICATION_EMAIL.' },
        },
      ],
    },
    {
      name: 'ingestWebsite',
      type: 'checkbox',
      label: 'Add website enquiries and sign-ups as contacts',
      admin: {
        description:
          'When on, every new website enquiry (event date) and sign-up (birthday) becomes an unverified contact. Leave off until the site has real customers.',
      },
    },
  ],
}
