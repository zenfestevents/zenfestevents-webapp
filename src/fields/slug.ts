import type { Field } from 'payload'

const format = (val: string): string =>
  val
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .toLowerCase()

/**
 * A URL-friendly slug field that auto-fills from a fallback field (default
 * "title") when left blank, so non-technical editors never have to think
 * about it.
 */
export const slugField = (fallback = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  index: true,
  unique: true,
  admin: {
    position: 'sidebar',
    description: 'URL identifier. Leave blank to auto-generate from the title.',
  },
  hooks: {
    beforeValidate: [
      ({ data, value }) => {
        if (typeof value === 'string' && value.length > 0) return format(value)
        const fb = data?.[fallback]
        if (typeof fb === 'string' && fb.length > 0) return format(fb)
        return value
      },
    ],
  },
})
