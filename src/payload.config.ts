import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { buildConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Services } from './collections/Services'
import { Packages } from './collections/Packages'
import { Projects } from './collections/Projects'
import { Leads } from './collections/Leads'
import { Signups } from './collections/Signups'
import { VendorApplications } from './collections/VendorApplications'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUri = process.env.DATABASE_URI || 'file:./zenfest.db'
const usePostgres = databaseUri.startsWith('postgres')
const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' — Zenfest Events',
    },
  },
  collections: [
    Users,
    Media,
    Categories,
    Services,
    Packages,
    Projects,
    Leads,
    Signups,
    VendorApplications,
  ],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Auto-select the database: Postgres (Neon) in production, SQLite locally.
  db: usePostgres
    ? postgresAdapter({ pool: { connectionString: databaseUri } })
    : sqliteAdapter({ client: { url: databaseUri } }),
  sharp,
  cors: [serverURL],
  csrf: [serverURL],
  // Send notification emails only when SMTP is configured; otherwise Payload
  // logs emails to the console (fine for local dev — submissions still save).
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM || 'zenfestevents@gmail.com',
        defaultFromName: 'Zenfest Events',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      })
    : undefined,
  plugins: [
    // Store uploaded media in Vercel Blob when a token is present (production);
    // otherwise Payload uses the local filesystem (local dev).
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            enabled: true,
            collections: { media: true },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
})
