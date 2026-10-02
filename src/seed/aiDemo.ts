import 'dotenv/config'
// Demo Zenfest AI specialist data for the seeded services, so the AI works locally.
// SAMPLE prices only: on the live site the owner enters real options and ranges in
// /admin → Services → "Zenfest AI specialist".
//
//   npm run seed:ai   adds this to existing local services whose AI options are empty
import type { Service } from '../payload-types'

type AiGroup = NonNullable<Service['ai']>

export const AI_DEMO: Record<string, AiGroup> = {
  Decoration: {
    enabled: true,
    agentName: 'Zenfest Décor',
    agentEmoji: '🎨',
    persona: 'A warm, visual décor stylist who knows Chennai wedding halls and South Indian traditions.',
    options: [
      { name: 'Stage décor – floral backdrop', unit: 'event', priceMin: 25000, priceMax: 60000, description: 'Fresh and artificial flower backdrop with seating for the couple or guest of honour.' },
      { name: 'Traditional mandap décor', unit: 'event', priceMin: 40000, priceMax: 120000, description: 'Pillared mandap with marigold, jasmine and banana-leaf styling for the muhurtham.' },
      { name: 'Entrance arch & welcome board', unit: 'event', priceMin: 8000, priceMax: 20000 },
      { name: 'Hall & table florals', unit: 'event', priceMin: 10000, priceMax: 35000 },
      { name: 'Balloon theme décor', unit: 'event', priceMin: 6000, priceMax: 25000, description: 'Themed balloon backdrop and arches, popular for birthdays and baby showers.' },
      { name: 'Lighting & drapes', unit: 'event', priceMin: 15000, priceMax: 45000 },
    ],
    rules:
      'Stage décor needs venue access 6 hours before the event. Fresh flower prices rise in the peak wedding months (Thai, Aavani). Outdoor setups need a rain backup plan.',
    faqs: [{ question: 'Can I see past décor?', answer: 'Yes — the team shares photos from similar events on WhatsApp.' }],
  },
  Catering: {
    enabled: true,
    agentName: 'Zenfest Kitchen',
    agentEmoji: '🍛',
    persona: 'A friendly head caterer who plans South Indian and multi-cuisine menus for any crowd.',
    options: [
      { name: 'South Indian veg banana-leaf meal', unit: 'plate', priceMin: 250, priceMax: 450, minQty: 100 },
      { name: 'Veg multi-cuisine buffet', unit: 'plate', priceMin: 350, priceMax: 650, minQty: 100 },
      { name: 'Non-veg buffet (biryani & more)', unit: 'plate', priceMin: 450, priceMax: 850, minQty: 100 },
      { name: 'Breakfast tiffin spread', unit: 'plate', priceMin: 120, priceMax: 220, minQty: 50 },
      { name: 'Snacks with tea & coffee', unit: 'person', priceMin: 60, priceMax: 150, minQty: 50 },
      { name: 'Live counter (dosa, chaat or ice cream)', unit: 'event', priceMin: 8000, priceMax: 20000 },
    ],
    rules:
      'Minimum 50 plates for any order; meals and buffets minimum 100. Serving staff included; GST extra. Tasting available for weddings.',
    faqs: [],
  },
  Photography: {
    enabled: true,
    agentName: 'Zenfest Lens',
    agentEmoji: '📸',
    persona: 'A candid photographer and filmmaker who loves natural, emotional moments.',
    options: [
      { name: 'Candid photography (1 photographer)', unit: 'event', priceMin: 20000, priceMax: 40000 },
      { name: 'Traditional photo + video', unit: 'event', priceMin: 25000, priceMax: 50000 },
      { name: 'Cinematic highlight film', unit: 'event', priceMin: 30000, priceMax: 75000 },
      { name: 'Drone coverage', unit: 'event', priceMin: 10000, priceMax: 20000 },
      { name: 'Premium album (40 sheets)', unit: 'event', priceMin: 12000, priceMax: 30000 },
    ],
    rules:
      'Coverage is priced per event day; multi-day functions are priced per day. Edited photos in 2 weeks, album in 6–8 weeks. Drones need venue and police permission.',
    faqs: [],
  },
  'DJ & Sound': {
    enabled: true,
    agentName: 'Zenfest Beats',
    agentEmoji: '🎧',
    persona: 'An upbeat DJ and entertainment planner for sangeets, receptions, birthdays and corporate nights.',
    options: [
      { name: 'DJ with sound system', unit: 'hour', priceMin: 3000, priceMax: 6000, minQty: 3 },
      { name: 'Sound system only (speeches, ceremony)', unit: 'event', priceMin: 6000, priceMax: 15000 },
      { name: 'LED dance floor & lighting', unit: 'event', priceMin: 12000, priceMax: 30000 },
      { name: 'Live band or nadhaswaram', unit: 'event', priceMin: 20000, priceMax: 60000 },
      { name: 'Emcee / anchor', unit: 'event', priceMin: 8000, priceMax: 20000 },
    ],
    rules:
      'Amplified music usually has to stop by 10 pm at residential venues. The venue must provide power backup.',
    faqs: [],
  },
}

async function run() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../payload.config')
  const payload = await getPayload({ config })
  const res = await payload.find({ collection: 'services', limit: 100, depth: 0, pagination: false })
  for (const s of res.docs) {
    const demo = AI_DEMO[s.title]
    if (!demo) continue
    if (s.ai?.options?.length) {
      payload.logger.info(`Skipped ${s.title}: AI options already entered.`)
      continue
    }
    await payload.update({ collection: 'services', id: s.id, data: { ai: demo } })
    payload.logger.info(`Added Zenfest AI demo data to ${s.title}.`)
  }
  process.exit(0)
}

// Only when run directly (npm run seed:ai), not when imported by the main seed.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('seed/aiDemo.ts')) {
  run().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
