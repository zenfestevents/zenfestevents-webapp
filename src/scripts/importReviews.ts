import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

import { importGoogleReviews } from '../seed/importGoogleReviews'

/**
 * Copies the saved Google reviews (src/seed/googleReviews.ts) into Testimonials.
 * Production gets them from a data migration on deploy; this is for local SQLite or a
 * re-run. Skips reviews already there.
 */
async function run() {
  const payload = await getPayload({ config })
  const { created, skipped } = await importGoogleReviews(payload)
  console.log(`Testimonials: ${created} imported, ${skipped} already there.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
