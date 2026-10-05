import 'dotenv/config'
// Demo marketplace data for LOCAL development: four live vendors (with placeholder
// photos) and one couple account, so /marketplace, the vendor dashboard and
// /account can be tried without signing up. Never run against production.
//
//   npm run seed:marketplace   adds them if no vendor exists yet
//
// Demo logins (local only): every account below uses DEMO_PASSWORD.
import type { Payload } from 'payload'
import sharp from 'sharp'

export const DEMO_PASSWORD = 'zenfest-demo-2026'

const DEMO_VENDORS = [
  {
    email: 'studio@vendors.zenfest.test',
    name: 'Karthik R',
    businessName: 'Kolam Frames Studio',
    category: 'photography',
    areas: ['All over Chennai'],
    about:
      'Candid wedding photography and films with a calm, documentary style. We cover muhurtham to reception with two photographers and one cinematographer, and deliver an edited gallery in 3 weeks.\n\nTamil, Telugu and North Indian weddings across Chennai and Chengalpattu.',
    priceCard: [
      { item: 'Candid photography', unit: 'session', price: 25000, gstIncluded: true, note: '1 photographer, about 5 hours' },
      { item: 'Wedding film (cinematic)', unit: 'event', price: 60000, gstIncluded: true, note: '5–7 minute film + full video' },
      { item: 'Premium album (40 sheets)', unit: 'piece', price: 18000, gstIncluded: false },
    ],
    languages: ['tamil', 'english', 'telugu'],
    colour: '#1f4f6e',
  },
  {
    email: 'glow@vendors.zenfest.test',
    name: 'Divya S',
    businessName: 'Glow by Divya',
    category: 'makeup',
    areas: ['Tambaram', 'Chromepet', 'Velachery', 'Medavakkam'],
    about:
      'Bridal makeup artist with 8 years of South Indian bridal looks — HD and airbrush, hairstyling with fresh flowers, and saree draping. Trial session available at my Tambaram studio.',
    priceCard: [
      { item: 'Bridal makeup (HD) with hairstyle', unit: 'event', price: 18000, gstIncluded: true },
      { item: 'Reception look', unit: 'event', price: 12000, gstIncluded: true },
      { item: 'Family member makeup', unit: 'person', price: 2500, gstIncluded: true },
    ],
    languages: ['tamil', 'english'],
    colour: '#8a2f5a',
  },
  {
    email: 'decor@vendors.zenfest.test',
    name: 'Senthil M',
    businessName: 'Marigold Mandap Decor',
    category: 'decoration',
    areas: ['Guduvanchery', 'Tambaram', 'Kelambakkam', 'Chengalpattu'],
    about:
      'Traditional and modern stage and mandap decoration — fresh marigold and jasmine, banana-leaf styling, entrance arches and lighting. Setup the night before, removed after the event.',
    priceCard: [
      { item: 'Stage decoration (fresh flowers)', unit: 'event', price: 45000, gstIncluded: false, note: 'Backdrop, sofa, side arrangements' },
      { item: 'Entrance arch', unit: 'event', price: 12000, gstIncluded: false },
      { item: 'Car decoration', unit: 'event', price: 4500, gstIncluded: true },
    ],
    languages: ['tamil'],
    colour: '#a9791f',
  },
  {
    email: 'cakes@vendors.zenfest.test',
    name: 'Ayesha K',
    businessName: 'Sugar & Saffron Bakes',
    category: 'cake',
    areas: ['Anna Nagar', 'Mogappair', 'Ambattur', 'Porur'],
    about:
      'Home bakery (FSSAI registered) making tiered wedding cakes, engagement cakes and dessert tables. Eggless options for every flavour. Delivered and set up at the venue.',
    priceCard: [
      { item: 'Chocolate truffle cake', unit: 'kg', price: 1100, gstIncluded: true },
      { item: 'Rasmalai fusion cake', unit: 'kg', price: 1400, gstIncluded: true },
      { item: 'Two-tier wedding cake (3 kg)', unit: 'event', price: 5200, gstIncluded: true },
    ],
    languages: ['tamil', 'english', 'hindi'],
    colour: '#6e3b1f',
  },
] as const

async function placeholder(label: string, sub: string, accent: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient></defs>
    <rect width="1200" height="900" fill="url(#g)"/>
    <circle cx="600" cy="380" r="140" fill="none" stroke="#d9b24c" stroke-width="3" opacity="0.6"/>
    <text x="600" y="660" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" fill="#fbf7ee">${esc(label)}</text>
    <text x="600" y="730" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" letter-spacing="6" fill="#d9b24c">${esc(sub.toUpperCase())}</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer()
}

export async function seedMarketplace(payload: Payload) {
  if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
    payload.logger.warn('Marketplace demo seed skipped: never seed demo accounts into Postgres/production.')
    return
  }
  const { totalDocs } = await payload.count({ collection: 'vendors', overrideAccess: true })
  if (totalDocs > 0) {
    payload.logger.info('Marketplace demo seed skipped: vendors already exist.')
    return
  }

  for (const v of DEMO_VENDORS) {
    const vendor = await payload.create({
      collection: 'vendors',
      data: {
        email: v.email,
        password: DEMO_PASSWORD,
        name: v.name,
        businessName: v.businessName,
        slug: v.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        phone: '9000000000',
        phoneVerified: true,
        category: v.category,
        areas: [...v.areas],
        about: v.about,
        priceCard: v.priceCard.map((r) => ({ ...r })),
        languages: [...v.languages],
        listingStatus: 'published',
        _verified: true,
      },
      disableVerificationEmail: true,
      overrideAccess: true,
    })
    const photos: number[] = []
    for (const sub of ['portfolio 1', 'portfolio 2', 'portfolio 3', 'portfolio 4']) {
      const data = await placeholder(v.businessName, sub, v.colour)
      const doc = await payload.create({
        collection: 'vendor-media',
        data: { vendor: vendor.id, alt: `${v.businessName} — ${sub}` },
        file: { data, mimetype: 'image/jpeg', name: `${vendor.slug}-${sub.replace(/\s+/g, '-')}.jpg`, size: data.length },
        overrideAccess: true,
      })
      photos.push(doc.id)
    }
    await payload.update({
      collection: 'vendors',
      id: vendor.id,
      data: { gallery: photos, cover: photos[0] },
      overrideAccess: true,
    })
    payload.logger.info(`Seeded vendor ${v.businessName} (${v.email}).`)
  }

  await payload.create({
    collection: 'customers',
    data: {
      email: 'couple@zenfest.test',
      password: DEMO_PASSWORD,
      name: 'Priya & Arjun',
      phone: '9000000001',
      city: 'Tambaram',
      _verified: true,
    },
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  payload.logger.info('Seeded couple account couple@zenfest.test.')
}

// Only when run directly (npm run seed:marketplace), not when imported by the main seed.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('seed/marketplaceDemo.ts')) {
  ;(async () => {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../payload.config')
    await seedMarketplace(await getPayload({ config }))
    process.exit(0)
  })().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
