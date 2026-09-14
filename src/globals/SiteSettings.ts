import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'

/** Business-wide details: contact numbers, branches, hero copy, social links. */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: anyone,
    update: authenticated,
  },
  admin: { description: 'Contact details, branches and homepage text.' },
  fields: [
    {
      type: 'group',
      name: 'hero',
      label: 'Homepage hero',
      fields: [
        {
          name: 'headline',
          type: 'text',
          defaultValue: 'Unforgettable events, beautifully managed',
        },
        {
          name: 'subheadline',
          type: 'textarea',
          defaultValue:
            'Weddings, birthdays, corporate functions and more across Chennai — décor, catering, photography, DJ and complete packages.',
        },
      ],
    },
    {
      type: 'group',
      name: 'contact',
      label: 'Contact',
      fields: [
        { name: 'phonePrimary', type: 'text', label: 'Primary phone' },
        { name: 'phoneSecondary', type: 'text', label: 'Secondary phone' },
        {
          name: 'whatsapp',
          type: 'text',
          label: 'WhatsApp number',
          admin: {
            description: 'Full international format, digits only, e.g. 919876543210.',
          },
        },
        { name: 'email', type: 'email', defaultValue: 'zenfestevents@gmail.com' },
        { name: 'hours', type: 'text', label: 'Business hours' },
      ],
    },
    {
      name: 'branches',
      type: 'array',
      label: 'Branches',
      admin: { description: 'Your office locations.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'addressLine', type: 'textarea' },
        { name: 'phone', type: 'text' },
        { name: 'mapUrl', type: 'text', label: 'Google Maps link' },
      ],
    },
    {
      type: 'group',
      name: 'social',
      label: 'Social links',
      fields: [
        { name: 'instagram', type: 'text' },
        { name: 'facebook', type: 'text' },
        { name: 'youtube', type: 'text' },
      ],
    },
  ],
}
