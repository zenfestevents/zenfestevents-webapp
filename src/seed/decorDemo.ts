import 'dotenv/config'
// Demo Decoration catalog for LOCAL development: 3 suppliers and 10 decorations with
// placeholder photos and made-up prices, so the admin list, filters, margins and (later)
// /decorations can be tried. Never run against production.
//
//   npm run seed:decor   adds them if no decoration exists yet (FORCE_SEED=1 adds anyway)
import type { Payload } from 'payload'
import sharp from 'sharp'

import type { DecorCategory, DecorEventType, DecorPriceMode, DecorTheme } from '../lib/decorOptions'

const SUPPLIERS = [
  { key: 'stage', name: 'Demo Stage Decorators', phone: '6100000101', area: 'Tambaram' },
  { key: 'flower', name: 'Demo Flower House', phone: '6100000102', area: 'Guduvancheri' },
  { key: 'balloon', name: 'Demo Balloon Studio', phone: '6100000103', area: 'Velachery' },
] as const

type Demo = {
  title: string
  eventType: DecorEventType
  category: DecorCategory
  themes: DecorTheme[]
  kind?: 'item' | 'package'
  size: string
  includes: string
  description: string
  supplier: (typeof SUPPLIERS)[number]['key']
  vendorPrice: number
  clientPrice: number
  publicDisplay: DecorPriceMode
  status?: 'draft' | 'active' | 'archived'
  colour: string
  photos?: number
}

const DEMO: Demo[] = [
  { title: 'Peacock stage with jasmine strings', eventType: 'wedding', category: 'stage', themes: ['traditional', 'floral'], size: '24 ft × 12 ft stage', includes: 'Peacock cut-out backdrop, jasmine and rose strings, two brass lamps, carpet, 2 sofas', description: 'A classic Tamil wedding stage with a gold peacock backdrop and fresh jasmine strings.', supplier: 'stage', vendorPrice: 38000, clientPrice: 52000, publicDisplay: 'range', colour: '#7a2e1f', photos: 3 },
  { title: 'Royal reception stage — gold and ivory', eventType: 'wedding', category: 'stage', themes: ['royal', 'luxury'], size: '30 ft × 14 ft stage', includes: 'Panel backdrop, crystal chandeliers, LED wash lights, floral centre arch', description: 'A grand gold and ivory stage for the reception, lit with crystal chandeliers.', supplier: 'stage', vendorPrice: 85000, clientPrice: 118000, publicDisplay: 'from', colour: '#8a6414', photos: 2 },
  { title: 'Temple-style mandap with banana trees', eventType: 'wedding', category: 'mandap', themes: ['traditional', 'temple'], size: '12 ft × 12 ft mandap', includes: 'Four wooden pillars, banana trees, mango-leaf thoranam, marigold garlands', description: 'A traditional mandap with banana trees and mango-leaf thoranam for the muhurtham.', supplier: 'flower', vendorPrice: 26000, clientPrice: 36000, publicDisplay: 'range', colour: '#3f6b2a' },
  { title: 'Marigold entrance arch', eventType: 'wedding', category: 'entrance', themes: ['floral', 'traditional'], size: '10 ft arch', includes: 'Fresh marigold and rose arch, welcome board with names', description: 'A fresh marigold arch to welcome guests, with a name board.', supplier: 'flower', vendorPrice: 9000, clientPrice: 14000, publicDisplay: 'exact', colour: '#c47f1a' },
  { title: 'Kuthuvilakku lighting set (5 lamps)', eventType: 'housewarming', category: 'kuthuvilakku', themes: ['traditional'], size: '5 brass lamps, 3–5 ft', includes: 'Five polished brass kuthuvilakku, oil and wicks, flower decoration at the base', description: 'Brass lamps arranged at the entrance and pooja area for the housewarming.', supplier: 'flower', vendorPrice: 4500, clientPrice: 7500, publicDisplay: 'exact', colour: '#a9791f' },
  { title: 'Pastel balloon garland backdrop', eventType: 'birthday', category: 'balloon', themes: ['pastel', 'kids'], size: '8 ft × 8 ft backdrop', includes: 'Organic balloon garland, name neon sign, cake table cover', description: 'Soft pastel balloons in an organic garland around a neon name sign.', supplier: 'balloon', vendorPrice: 6500, clientPrice: 11000, publicDisplay: 'from', colour: '#b46c8f', photos: 2 },
  { title: 'Jungle theme birthday package', eventType: 'birthday', category: 'other', themes: ['kids'], kind: 'package', size: 'Hall up to 150 guests', includes: 'Entrance arch, stage backdrop, 10 table centrepieces, photo booth, balloon ceiling', description: 'A full jungle-theme setup for a child’s birthday: entrance, stage, tables and photo booth.', supplier: 'balloon', vendorPrice: 28000, clientPrice: 42000, publicDisplay: 'range', colour: '#2d6b3f', photos: 2 },
  { title: 'Corporate stage with LED wall', eventType: 'corporate', category: 'backdrop', themes: ['modern', 'minimal'], size: '16 ft × 9 ft LED wall', includes: 'LED video wall, podium, branding standees, wash lights', description: 'A clean modern stage for annual days and launches, with an LED wall for your slides.', supplier: 'stage', vendorPrice: 60000, clientPrice: 78000, publicDisplay: 'hidden', colour: '#1f3f6e' },
  { title: 'Shop opening ribbon & balloon entrance', eventType: 'shop_opening', category: 'entrance', themes: ['modern'], size: 'Shopfront up to 20 ft', includes: 'Balloon pillars, ribbon, scissors tray, banner stand', description: 'A bright entrance for a shop opening with balloon pillars and a ribbon-cutting setup.', supplier: 'balloon', vendorPrice: 5000, clientPrice: 8500, publicDisplay: 'from', colour: '#a33b3b' },
  { title: 'Old flower photo booth (archived example)', eventType: 'wedding', category: 'photo_booth', themes: ['floral'], size: '8 ft × 7 ft', includes: 'Flower wall, swing, props', description: 'An older photo booth kept only for past quotes.', supplier: 'flower', vendorPrice: 12000, clientPrice: 18000, publicDisplay: 'range', status: 'archived', colour: '#6e1f3a' },
]

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

/** A 1200×900 placeholder "photo": gradient, gold ring, the title and DEMO. */
async function placeholder(title: string, accent: string, n: number): Promise<Buffer> {
  const words = title.split(' ')
  const lines: string[] = []
  for (const w of words) {
    const last = lines[lines.length - 1]
    if (last && (last + ' ' + w).length <= 24) lines[lines.length - 1] = `${last} ${w}`
    else lines.push(w)
  }
  const text = lines
    .slice(0, 3)
    .map((l, i) => `<text x="600" y="${520 + i * 64}" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" fill="#fbf7ee">${esc(l)}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient></defs>
    <rect width="1200" height="900" fill="url(#g)"/>
    <circle cx="600" cy="290" r="${120 + n * 18}" fill="none" stroke="#d9b24c" stroke-width="3" opacity="0.6"/>
    ${text}
    <text x="600" y="800" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" letter-spacing="8" fill="#d9b24c">DEMO PHOTO ${n}</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()
}

export async function seedDecor(payload: Payload) {
  if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
    payload.logger.warn('Decor demo seed skipped: never seed demo decorations into Postgres/production.')
    return
  }
  const { totalDocs } = await payload.count({ collection: 'decor-items', overrideAccess: true })
  if (totalDocs > 0 && !process.env.FORCE_SEED) {
    payload.logger.info('Decor demo seed skipped: decorations already exist (FORCE_SEED=1 to add anyway).')
    return
  }

  const supplierIds = {} as Record<(typeof SUPPLIERS)[number]['key'], number>
  for (const s of SUPPLIERS) {
    const { docs } = await payload.find({
      collection: 'decor-suppliers',
      where: { phone: { equals: `91${s.phone}` } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const doc =
      docs[0] ??
      (await payload.create({
        collection: 'decor-suppliers',
        data: { name: s.name, phone: s.phone, area: s.area, notes: 'Demo supplier (local seed).' },
        overrideAccess: true,
      }))
    supplierIds[s.key] = doc.id
  }

  let n = 0
  for (const d of DEMO) {
    const photos: number[] = []
    for (let i = 1; i <= (d.photos ?? 1); i++) {
      const photo = await payload.create({
        collection: 'decor-photos',
        data: { alt: d.title },
        file: { data: await placeholder(d.title, d.colour, i), mimetype: 'image/jpeg', name: 'demo.jpg', size: 0 },
        overrideAccess: true,
      })
      photos.push(photo.id)
    }
    await payload.create({
      collection: 'decor-items',
      data: {
        title: d.title,
        eventType: d.eventType,
        category: d.category,
        themes: d.themes,
        kind: d.kind ?? 'item',
        size: d.size,
        includes: d.includes,
        description: d.description,
        photos,
        supplier: supplierIds[d.supplier],
        vendorPrice: d.vendorPrice,
        clientPrice: d.clientPrice,
        publicDisplay: d.publicDisplay,
        status: d.status ?? 'active',
        notes: 'Demo item — prices are made up.',
      },
      overrideAccess: true,
    })
    n++
  }
  payload.logger.info(`Seeded ${n} demo decorations and ${SUPPLIERS.length} suppliers.`)
}

// Only when run directly (npm run seed:decor).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('seed/decorDemo.ts')) {
  ;(async () => {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../payload.config')
    await seedDecor(await getPayload({ config }))
    process.exit(0)
  })().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
