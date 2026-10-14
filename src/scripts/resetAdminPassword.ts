import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * Sets a new password for an existing admin (`users`) account — e.g. when the
 * local admin password is forgotten (without SMTP, "Forgot password?" can't
 * send its email). Also clears any login lockout.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="..."; npm run reset:admin-password
 *
 * DATABASE_URI decides which database is changed (local SQLite by default).
 */
async function run() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const target = (process.env.DATABASE_URI || 'file:./zenfest.db').startsWith('postgres') ? 'Postgres' : 'SQLite'
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  const user = found.docs[0]
  if (!user) {
    console.error(`${target}: no admin user with email ${email}.`)
    process.exit(1)
  }

  await payload.update({ collection: 'users', id: user.id, data: { password, loginAttempts: 0, lockUntil: null } })
  console.log(`${target}: password updated for ${email}. Sign in at /admin/login.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
