import 'dotenv/config'
import { readFileSync } from 'fs'
import { getPayload } from 'payload'

import config from '../payload.config'
import type { Contact } from '../payload-types'
import { istYmd, parseLooseDate, ymdToIso } from '../lib/occasions/dates'
import { toWaNumber } from '../lib/occasions/message'
import { BRANCHES, CONTACT_SOURCES, OCCASION_TYPES, RELATIONSHIPS } from '../lib/occasions/options'

/**
 * Imports contacts + occasions from a CSV (template: docs/occasions-import-template.csv).
 * One row per occasion; rows with the same phone become one contact. Existing
 * contacts (same phone) get the new occasions added; an occasion already on file
 * (same type and day) is skipped, so re-running the same file is safe.
 *
 * Usage:
 *   npm run import:occasions -- path/to/file.csv            (check only, nothing saved)
 *   npm run import:occasions -- path/to/file.csv --save     (write to the database)
 *
 * Point DATABASE_URI at Neon to import into production.
 */

type Row = Record<string, string>

/** Minimal CSV parser: quoted fields, "" escapes, commas/newlines inside quotes. */
function parseCsv(text: string): Row[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let quoted = false
  const endRow = () => {
    row.push(field)
    rows.push(row)
    row = []
    field = ''
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      endRow()
    } else field += c
  }
  if (field || row.length) endRow()
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim()))
  const keys = (header ?? []).map((h) => h.trim().toLowerCase().replace(/^﻿/, ''))
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

const yes = (v: string) => /^(y|yes|true|1)$/i.test(v)
const pick = <T extends readonly { value: string; label: string }[]>(list: T, v: string, fallback?: T[number]['value']) => {
  const s = v.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return (list.find((o) => o.value === s || o.label.toLowerCase() === v.trim().toLowerCase())?.value ?? fallback) as
    | T[number]['value']
    | undefined
}

async function run() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'))
  const save = process.argv.includes('--save')
  if (!file) {
    console.error('Usage: npm run import:occasions -- path/to/file.csv [--save]')
    process.exit(1)
  }

  const rows = parseCsv(readFileSync(file, 'utf8'))
  const errors: string[] = []
  const people = new Map<string, { name: string; data: Partial<Contact>; occasions: NonNullable<Contact['occasions']> }>()

  rows.forEach((r, i) => {
    const line = i + 2
    const phone = toWaNumber(r.phone)
    const type = pick(OCCASION_TYPES, r.occasion_type ?? '')
    const date = parseLooseDate(r.date ?? '')
    if (!r.name) return errors.push(`Line ${line}: name is missing`)
    if (!phone) return errors.push(`Line ${line}: phone "${r.phone}" is not a mobile number`)
    if (!type) return errors.push(`Line ${line}: occasion_type "${r.occasion_type}" — use one of ${OCCASION_TYPES.map((t) => t.value).join(', ')}`)
    if (!date) return errors.push(`Line ${line}: date "${r.date}" not understood — use DD-MM-YYYY (or DD-MM if the year is unknown)`)

    const person = people.get(phone) ?? {
      name: r.name,
      data: {
        name: r.name,
        phone,
        relationship: pick(RELATIONSHIPS, r.relationship ?? '', 'client'),
        source: pick(CONTACT_SOURCES, r.source ?? '', 'past_event_import'),
        branch: pick(BRANCHES, r.branch ?? ''),
        email: r.email || undefined,
        notes: r.notes || undefined,
        verified: true,
      },
      occasions: [],
    }
    person.occasions.push({
      type,
      date: ymdToIso(date.ymd),
      yearKnown: date.yearKnown,
      personName: r.person_name || undefined,
      label: r.occasion_name || undefined,
      eventWithUs: yes(r.event_with_us ?? ''),
      active: true,
    })
    people.set(phone, person)
  })

  if (errors.length) {
    console.log(`\n${errors.length} row(s) skipped:\n  ${errors.join('\n  ')}\n`)
  }
  const occasionCount = [...people.values()].reduce((n, p) => n + p.occasions.length, 0)
  console.log(`${rows.length} rows → ${people.size} contacts, ${occasionCount} occasions.`)
  if (!save) {
    console.log('Check only — nothing saved. Re-run with --save to import.')
    process.exit(0)
  }

  const payload = await getPayload({ config })
  let created = 0
  let updated = 0
  let added = 0
  for (const [phone, person] of people) {
    const found = await payload.find({ collection: 'contacts', where: { phone: { equals: phone } }, limit: 1, depth: 0 })
    const existing = found.docs[0]
    if (!existing) {
      await payload.create({ collection: 'contacts', data: { ...person.data, occasions: person.occasions } as Contact })
      created++
      added += person.occasions.length
      continue
    }
    const sameDay = (a: string, b: string) => {
      const x = istYmd(a)
      const y = istYmd(b)
      return Boolean(x && y && x.m === y.m && x.d === y.d)
    }
    const fresh = person.occasions.filter(
      (o) => !(existing.occasions ?? []).some((e) => e.type === o.type && sameDay(e.date, o.date)),
    )
    if (fresh.length === 0) continue
    await payload.update({
      collection: 'contacts',
      id: existing.id,
      data: { occasions: [...(existing.occasions ?? []), ...fresh] },
    })
    updated++
    added += fresh.length
  }
  console.log(`Saved: ${created} new contacts, ${updated} updated, ${added} occasions added.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
