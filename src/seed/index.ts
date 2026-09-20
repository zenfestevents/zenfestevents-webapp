import 'dotenv/config'
import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '../payload.config'

/* ---------- placeholder image generator (brand-safe, offline) ---------- */
const PLUM = '#2e1026'
const xml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
async function placeholder(labelRaw: string, subRaw: string, accent: string): Promise<Buffer> {
  const label = xml(labelRaw)
  const sub = xml(subRaw)
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${accent}"/>
        <stop offset="1" stop-color="${PLUM}"/>
      </linearGradient>
    </defs>
    <rect width="1400" height="1000" fill="url(#g)"/>
    <g transform="translate(700,470)" fill="none" stroke="#f2a007" stroke-width="3" opacity="0.6">
      ${[0, 45, 90, 135, 180, 225, 270, 315]
        .map((d) => `<path transform="rotate(${d})" d="M0 0 C 40 -55, 135 -55, 185 0 C 135 55, 40 55, 0 0 Z"/>`)
        .join('')}
      <circle r="10" fill="#f2a007" stroke="none"/>
    </g>
    <text x="700" y="770" text-anchor="middle" font-family="Georgia, serif" font-size="86" fill="#fffdf9" font-style="italic">${label}</text>
    <text x="700" y="840" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" letter-spacing="6" fill="#f2a007">${sub.toUpperCase()}</text>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function run() {
  const payload = await getPayload({ config })

  const existing = await payload.count({ collection: 'categories' })
  if (existing.totalDocs > 0 && !process.env.FORCE_SEED) {
    payload.logger.info('Seed skipped: data already exists. Set FORCE_SEED=1 to re-run.')
    process.exit(0)
  }

  payload.logger.info('Seeding Zenfest Events content…')

  /* ---------- Site settings ---------- */
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      hero: {
        headline: 'Every celebration, beautifully managed',
        subheadline:
          'Weddings, birthdays, corporate functions and more across Chennai — décor, catering, photography, DJ and complete packages, handled end to end.',
      },
      contact: {
        phonePrimary: '+91 90800 89530',
        phoneSecondary: '',
        whatsapp: '919080089530',
        email: 'zenfestevents@gmail.com',
        hours: 'Mon–Sun, 9am–8pm',
      },
      branches: [
        {
          name: 'Guduvancheri',
          addressLine: 'GST Road corridor, Guduvancheri, Chennai — 603202',
          phone: '+91 90800 89530',
          mapUrl: 'https://share.google/k8Hao1mw5sY2I1Xrk',
        },
        {
          name: 'Thiruverkadu',
          addressLine: 'Thiruverkadu, Chennai — 600077',
          phone: '+91 90800 89530',
          mapUrl: 'https://share.google/wsQlBEhpbRxSq8WpR',
        },
      ],
      social: { instagram: '', facebook: '', youtube: '' },
    },
  })

  /* ---------- Categories ---------- */
  const catData = [
    { title: 'Weddings', slug: 'weddings', order: 1, color: '#8a1f4a' },
    { title: 'Birthdays', slug: 'birthdays', order: 2, color: '#c8621f' },
    { title: 'Corporate', slug: 'corporate', order: 3, color: '#1f5f6e' },
    { title: 'Housewarmings', slug: 'housewarmings', order: 4, color: '#1f6e5a' },
    { title: 'Sports Events', slug: 'sports', order: 5, color: '#6e401f' },
  ]
  const cats: Record<string, number> = {}
  for (const c of catData) {
    const doc = await payload.create({
      collection: 'categories',
      data: { title: c.title, slug: c.slug, order: c.order, description: `${c.title} planned and managed end to end.` },
    })
    cats[c.slug] = doc.id
  }

  /* ---------- Services ---------- */
  const svcData = [
    ['Decoration', 'Themes, florals, stage & mandap styling.', 'Themes, florals, stage and mandap styling, lighting and draping tailored to your event and venue.'],
    ['Catering', 'Multi-cuisine menus for every scale.', 'Multi-cuisine vegetarian and non-vegetarian menus for any guest count, with tasting and full service.'],
    ['Photography', 'Candid & traditional photo and video.', 'Candid and traditional photography and videography, albums and highlight films to keep every moment.'],
    ['DJ & Sound', 'Music, lighting and live entertainment.', 'Professional DJ, sound, lighting and live entertainment to set the mood for any celebration.'],
    ['Complete Coordination', 'One team managing the whole day.', 'A single team managing vendors, timeline and the day itself, so you can enjoy your event.'],
  ]
  const svcs: Record<string, number> = {}
  let si = 1
  for (const [title, summary, description] of svcData) {
    const doc = await payload.create({
      collection: 'services',
      data: { title, summary, description, order: si, featured: si <= 4 },
    })
    svcs[title] = doc.id
    si++
  }

  /* ---------- helper: create a media doc from a placeholder ---------- */
  const makeMedia = async (label: string, sub: string, accent: string) => {
    const buf = await placeholder(label, sub, accent)
    const doc = await payload.create({
      collection: 'media',
      data: { alt: `${label} — ${sub}` },
      file: { data: buf, mimetype: 'image/png', name: `${label}-${sub}`.replace(/\s+/g, '-').toLowerCase() + '.png', size: buf.length },
    })
    return doc.id
  }

  /* ---------- Packages ---------- */
  const pkgData = [
    { title: 'Classic Wedding', tagline: 'Everything for a beautiful, stress-free wedding.', services: ['Decoration', 'Catering', 'Photography'], idealFor: ['weddings'], price: 'Starting from ₹1,50,000', featured: true, highlights: ['Stage & mandap décor', 'Multi-cuisine catering', 'Candid photo & video', 'On-day coordination'] },
    { title: 'Grand Celebration', tagline: 'Our full-service package for the big occasions.', services: ['Decoration', 'Catering', 'Photography', 'DJ & Sound', 'Complete Coordination'], idealFor: ['weddings', 'housewarmings'], price: 'Custom quote', featured: true, highlights: ['Premium décor & lighting', 'Full catering service', 'Photo, video & album', 'DJ, sound & entertainment', 'Dedicated event manager'] },
    { title: 'Birthday Bash', tagline: 'Colourful, fun celebrations for all ages.', services: ['Decoration', 'DJ & Sound', 'Photography'], idealFor: ['birthdays'], price: 'Starting from ₹35,000', featured: true, highlights: ['Themed decoration', 'Music & entertainment', 'Photography', 'Cake & catering add-ons'] },
    { title: 'Corporate Pro', tagline: 'Polished events that represent your brand.', services: ['Decoration', 'Catering', 'Photography'], idealFor: ['corporate'], price: 'Custom quote', featured: false, highlights: ['Stage & branding setup', 'Catering & refreshments', 'Event photography', 'AV & coordination'] },
  ]
  let pi = 1
  for (const p of pkgData) {
    await payload.create({
      collection: 'packages',
      data: {
        title: p.title,
        tagline: p.tagline,
        priceNote: p.price,
        featured: p.featured,
        order: pi++,
        idealFor: p.idealFor.map((s) => cats[s]).filter(Boolean),
        includedServices: p.services.map((s) => svcs[s]).filter(Boolean),
        highlights: p.highlights.map((item) => ({ item })),
      },
    })
  }

  /* ---------- Projects (gallery) ---------- */
  const projData = [
    { title: 'Lakshmi & Arjun', cat: 'weddings', color: '#8a1f4a', branch: 'guduvancheri', location: 'Guduvancheri', featured: true },
    { title: 'Royal Reception', cat: 'weddings', color: '#7a1f52', branch: 'thiruverkadu', location: 'Thiruverkadu', featured: true },
    { title: "Aarav's 5th Birthday", cat: 'birthdays', color: '#c8621f', branch: 'guduvancheri', location: 'Chennai', featured: true },
    { title: 'Unicorn Theme Party', cat: 'birthdays', color: '#c85a2f', branch: 'thiruverkadu', location: 'Chennai', featured: false },
    { title: 'TechCorp Annual Day', cat: 'corporate', color: '#1f5f6e', branch: 'guduvancheri', location: 'OMR, Chennai', featured: true },
    { title: 'New Home Blessing', cat: 'housewarmings', color: '#1f6e5a', branch: 'thiruverkadu', location: 'Thiruverkadu', featured: false },
    { title: 'Inter-School Sports Meet', cat: 'sports', color: '#6e401f', branch: 'guduvancheri', location: 'Guduvancheri', featured: false },
  ] as const
  for (const pr of projData) {
    const cover = await makeMedia(pr.title, pr.cat, pr.color)
    const photos = [
      await makeMedia(pr.title, 'moment 1', pr.color),
      await makeMedia(pr.title, 'moment 2', pr.color),
    ]
    await payload.create({
      collection: 'projects',
      data: {
        title: pr.title,
        category: cats[pr.cat],
        coverImage: cover,
        photos,
        branch: pr.branch,
        location: pr.location,
        featured: pr.featured,
        description: `A ${pr.cat.replace(/s$/, '')} event managed by Zenfest Events.`,
      },
    })
  }

  payload.logger.info('✅ Seed complete.')
  process.exit(0)
}

run().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
