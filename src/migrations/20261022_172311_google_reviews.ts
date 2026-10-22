import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

import { importGoogleReviews } from '../seed/importGoogleReviews'

// Data, not schema: loads the Google Business reviews (src/seed/googleReviews.ts) into the
// testimonials table created by the migration before this one, so production gets them on
// deploy. Re-running is harmless — reviews already there are skipped.
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const { created, skipped } = await importGoogleReviews(payload, req)
  payload.logger.info(`Google reviews: ${created} imported, ${skipped} already there.`)
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'testimonials', where: { source: { equals: 'google' } }, req })
}
