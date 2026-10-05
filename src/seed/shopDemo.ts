import 'dotenv/config'
// Demo Zenfest Shop products for LOCAL development: partner-store (affiliate)
// items and items sold by the demo marketplace vendors, with placeholder photos,
// so /shop and "Add to my registry" can be tried. Never run against production.
//
//   npm run seed:shop   adds them if no product exists yet
//                       (run `npm run seed:marketplace` first for the seller items)
import type { Payload } from 'payload'
import sharp from 'sharp'

type Demo = {
  title: string
  occasions: string[]
  productType: string
  price: number
  mrp?: number
  description: string
  colour: string
  featured?: boolean
} & ({ source: 'affiliate'; search: string } | { source: 'seller'; vendorCategory: string; shipsTo: 'india' | 'state'; dispatchDays: number; returnPolicy: string })

// Affiliate items link to a store search (not a made-up product page).
const amazon = (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`

const DEMO_PRODUCTS: Demo[] = [
  { source: 'affiliate', search: amazon('haldi decoration kit yellow'), title: 'Haldi decoration kit — marigold garlands & backdrop', occasions: ['haldi'], productType: 'decor', price: 1299, mrp: 1999, featured: true, colour: '#c99a06', description: 'Yellow and orange artificial marigold strings, a fabric backdrop and fairy lights — enough for a 6 × 8 ft haldi corner.' },
  { source: 'affiliate', search: amazon('haldi flower jewellery set bride'), title: 'Floral haldi jewellery set for the bride', occasions: ['haldi', 'mehendi'], productType: 'jewellery', price: 649, mrp: 999, colour: '#d27d2d', description: 'Lightweight artificial flower necklace, earrings, maang tikka and two bracelets.' },
  { source: 'affiliate', search: amazon('mehendi cushion floor seating set'), title: 'Mehendi floor cushions (set of 5)', occasions: ['mehendi', 'sangeet'], productType: 'decor', price: 2499, mrp: 3299, colour: '#3f7a4a', description: 'Bright printed cushion covers with fillers for a comfortable mehendi lounge.' },
  { source: 'affiliate', search: amazon('sangeet photo booth props'), title: 'Sangeet photo booth props (30 pieces)', occasions: ['sangeet', 'reception'], productType: 'party', price: 399, mrp: 599, featured: true, colour: '#7a2e6b', description: 'Desi-themed speech bubbles, turbans, moustaches and hashtag boards on sturdy sticks.' },
  { source: 'affiliate', search: amazon('wedding welcome board stand'), title: 'Personalised wedding welcome board', occasions: ['wedding', 'reception'], productType: 'decor', price: 1899, colour: '#1f4f6e', description: 'Acrylic welcome sign with your names and date, with a floor easel.' },
  { source: 'affiliate', search: amazon('ring platter engagement decorated'), title: 'Engagement ring platter with flowers', occasions: ['engagement'], productType: 'decor', price: 549, mrp: 799, colour: '#a33b3b', description: 'Velvet ring platter with artificial roses and pearl border.' },
  { source: 'affiliate', search: amazon('birthday decoration kit balloons'), title: 'Birthday balloon decoration kit (75 pieces)', occasions: ['birthday'], productType: 'party', price: 499, mrp: 899, featured: true, colour: '#2d5fa8', description: 'Metallic and chrome balloons, a Happy Birthday banner, curtains and tape.' },
  { source: 'affiliate', search: amazon('valaikappu bangles baby shower'), title: 'Valaikappu glass bangles (6 dozen)', occasions: ['baby-shower'], productType: 'pooja', price: 449, colour: '#2e7d6b', description: 'Traditional green and red glass bangles for the valaikappu ceremony.' },
  { source: 'affiliate', search: amazon('griha pravesh toran door hanging'), title: 'Griha pravesh mango-leaf toran', occasions: ['housewarming', 'pooja'], productType: 'decor', price: 299, mrp: 499, colour: '#4e7a2d', description: 'Artificial mango leaves and marigolds, 40 inches, reusable.' },
  { source: 'affiliate', search: amazon('brass diya set pooja'), title: 'Brass diya set for pooja (pack of 6)', occasions: ['pooja', 'housewarming', 'wedding'], productType: 'pooja', price: 799, mrp: 1099, colour: '#8a6414', description: 'Hand-polished brass diyas, ready for festivals and functions.' },
  { source: 'affiliate', search: amazon('corporate gift hamper premium'), title: 'Premium corporate gift hamper', occasions: ['corporate'], productType: 'gifts', price: 1499, colour: '#3a3a3a', description: 'Dry fruits, a brass diya and a thank-you card in a reusable box.' },
  { source: 'seller', vendorCategory: 'decoration', shipsTo: 'state', dispatchDays: 3, returnPolicy: 'Made to order — no returns unless damaged. Tell us within 48 hours with photos.', title: 'Personalised haldi signage (name board)', occasions: ['haldi', 'wedding'], productType: 'decor', price: 1499, featured: true, colour: '#b5651d', description: 'Hand-painted wooden board with the couple’s names, delivered across Tamil Nadu.' },
  { source: 'seller', vendorCategory: 'decoration', shipsTo: 'state', dispatchDays: 2, returnPolicy: 'Returns within 7 days if unused, in original packing.', title: 'Mandap flower strings — jasmine & rose (artificial)', occasions: ['wedding', 'engagement'], productType: 'decor', price: 2299, mrp: 2799, colour: '#6e1f3a', description: 'Ten 6-ft strings of realistic jasmine and rose, reusable for every function.' },
  { source: 'seller', vendorCategory: 'cake', shipsTo: 'state', dispatchDays: 1, returnPolicy: 'Food items can’t be returned. Replaced if damaged on delivery.', title: 'Return-gift laddoo boxes (pack of 25)', occasions: ['wedding', 'housewarming', 'baby-shower'], productType: 'return-gifts', price: 1750, colour: '#c47f1a', description: 'Two besan laddoos in a gold-print box with your custom thank-you sticker. Chennai and nearby.' },
  { source: 'seller', vendorCategory: 'decoration', shipsTo: 'india', dispatchDays: 4, returnPolicy: 'Personalised — no returns unless damaged or wrong.', title: 'Name-printed jute return-gift bags (pack of 50)', occasions: ['wedding', 'birthday', 'baby-shower'], productType: 'return-gifts', price: 2250, mrp: 2750, colour: '#7d5a32', description: 'Eco-friendly jute bags with your names and date printed in gold.' },
]

async function placeholder(label: string, sub: string, accent: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const words = label.split(' ')
  const lines: string[] = []
  for (const w of words) {
    const last = lines[lines.length - 1]
    if (last && (last + ' ' + w).length <= 22) lines[lines.length - 1] = `${last} ${w}`
    else lines.push(w)
  }
  const text = lines
    .slice(0, 3)
    .map((l, i) => `<text x="500" y="${560 + i * 64}" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" fill="#fbf7ee">${esc(l)}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient></defs>
    <rect width="1000" height="1000" fill="url(#g)"/>
    <circle cx="500" cy="330" r="130" fill="none" stroke="#d9b24c" stroke-width="3" opacity="0.6"/>
    ${text}
    <text x="500" y="820" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" letter-spacing="6" fill="#d9b24c">${esc(sub.toUpperCase())}</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer()
}

export async function seedShop(payload: Payload) {
  if ((process.env.DATABASE_URI || '').startsWith('postgres')) {
    payload.logger.warn('Shop demo seed skipped: never seed demo products into Postgres/production.')
    return
  }
  const { totalDocs } = await payload.count({ collection: 'products', overrideAccess: true })
  if (totalDocs > 0) {
    payload.logger.info('Shop demo seed skipped: products already exist.')
    return
  }

  let n = 0
  for (const p of DEMO_PRODUCTS) {
    let vendor: number | undefined
    if (p.source === 'seller') {
      const { docs } = await payload.find({
        collection: 'vendors',
        where: { and: [{ category: { equals: p.vendorCategory } }, { listingStatus: { equals: 'published' } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      vendor = docs[0]?.id
      if (!vendor) {
        payload.logger.warn(`Skipping "${p.title}": no live ${p.vendorCategory} vendor (run npm run seed:marketplace).`)
        continue
      }
    }
    const image = await payload.create({
      collection: 'media',
      data: { alt: p.title },
      file: {
        data: await placeholder(p.title, p.source === 'affiliate' ? 'partner store' : 'zenfest seller', p.colour),
        mimetype: 'image/jpeg',
        name: `shop-demo-${n + 1}.jpg`,
        size: 0,
      },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'products',
      data: {
        title: p.title,
        status: 'published',
        featured: Boolean(p.featured),
        sortOrder: n,
        source: p.source,
        occasions: p.occasions,
        productType: p.productType as never,
        price: p.price,
        mrp: p.mrp,
        description: p.description,
        images: [image.id],
        ...(p.source === 'affiliate'
          ? { affiliateUrl: p.search }
          : { vendor, shipsTo: p.shipsTo, dispatchDays: p.dispatchDays, returnPolicy: p.returnPolicy }),
      },
      overrideAccess: true,
    })
    n++
  }
  payload.logger.info(`Seeded ${n} shop products.`)
}

// Only when run directly (npm run seed:shop).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('seed/shopDemo.ts')) {
  ;(async () => {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../payload.config')
    await seedShop(await getPayload({ config }))
    process.exit(0)
  })().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
