import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * Creates the first admin user from the command line.
 *
 * Why this exists: Payload's built-in `/admin/create-first-user` screen renders
 * blank on Payload 3.88 + Next 16.3.3 — the view is present in the RSC stream but
 * never reaches the DOM (reproducible locally against an empty database, under
 * both Turbopack and webpack, so it is not a deploy or bundler problem). The
 * `/admin/login` screen renders correctly, so seeding the first user here is
 * enough to make the whole admin panel usable.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="..."; npm run create:admin
 *
 * Point DATABASE_URI at Neon first to create the production admin. The password is
 * read from the environment and never stored in the repo.
 */
async function run() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Zenfest Admin'

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const target = (process.env.DATABASE_URI || 'file:./zenfest.db').startsWith('postgres')
    ? 'Postgres'
    : 'SQLite'

  const existing = await payload.find({
    collection: 'users',
    limit: 1,
    pagination: false,
  })

  if (existing.totalDocs > 0) {
    console.log(
      `${target}: ${existing.totalDocs} admin user(s) already exist. Nothing created — sign in at /admin/login.`,
    )
    process.exit(0)
  }

  const user = await payload.create({
    collection: 'users',
    data: { email, password, name },
  })

  console.log(`${target}: created admin user ${user.email}. Sign in at /admin/login.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
