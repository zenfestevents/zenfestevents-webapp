import type { GlobalConfig } from 'payload'

import { anyone } from '../access'
import { canManage } from '../access/roles'
import { CONTENT_TAGS } from '../lib/contentCache'
import { revalidateGlobal } from '../hooks/revalidateContent'

/** Business-wide details: contact numbers, branches, hero copy, social links. */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  hooks: { afterChange: [revalidateGlobal(CONTENT_TAGS.settings)] },
  label: 'Website settings',
  access: {
    read: anyone,
    update: canManage,
  },
  admin: {
    group: 'Website',
    description: 'Phone numbers, branches and homepage text shown on the website. Only a Manager or the Owner can change these.',
  },
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
            "Weddings, birthdays, corporate functions and more across Tamil Nadu's major cities — décor, catering, photography, DJ and complete packages.",
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
      name: 'ai',
      label: 'Zenfest AI',
      admin: {
        description:
          'The AI event planner (chat bubble, homepage band, /plan). It also needs ANTHROPIC_API_KEY set on the server.',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          label: 'Zenfest AI switched on',
          admin: { description: 'Untick to hide the AI everywhere; its buttons then go to the contact page.' },
        },
        {
          name: 'greeting',
          type: 'textarea',
          maxLength: 400,
          admin: { description: 'First message customers see in the chat.' },
        },
        { name: 'bandHeadline', type: 'text', maxLength: 90, label: 'Homepage band headline' },
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
    {
      type: 'group',
      name: 'reviews',
      label: 'Google reviews',
      admin: { description: 'Shown on the Testimonials page. Update the rating and count from Google now and then.' },
      fields: [
        { name: 'googleUrl', type: 'text', label: 'Link to all Google reviews' },
        { name: 'googleRating', type: 'number', label: 'Google rating', min: 1, max: 5 },
        { name: 'googleCount', type: 'number', label: 'Number of Google reviews', min: 0 },
      ],
    },
    {
      // The homepage scoreboard's "events delivered" — a real number only; blank hides it.
      name: 'eventsDelivered',
      type: 'number',
      label: 'Events delivered',
      min: 0,
      admin: { description: 'Shown on the homepage scoreboard. Leave blank to hide it.' },
    },
  ],
}
