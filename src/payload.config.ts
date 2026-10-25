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
import { Testimonials } from './collections/Testimonials'
import { Leads } from './collections/Leads'
import { Signups } from './collections/Signups'
import { VendorApplications } from './collections/VendorApplications'
import { PhoneVerifications } from './collections/PhoneVerifications'
import { VendorUploads } from './collections/VendorUploads'
import { HostApplications } from './collections/HostApplications'
import { RegistryEvents } from './collections/RegistryEvents'
import { RegistryItems } from './collections/RegistryItems'
import { RegistryClaims } from './collections/RegistryClaims'
import { RegistryClicks } from './collections/RegistryClicks'
import { RegistryGuests } from './collections/RegistryGuests'
import { RegistryLeads } from './collections/RegistryLeads'
import { Polls } from './collections/Polls'
import { PollVotes } from './collections/PollVotes'
import { PollVoters } from './collections/PollVoters'
import { AiConversations } from './collections/AiConversations'
import { Vendors } from './collections/Vendors'
import { Customers } from './collections/Customers'
import { VendorMedia } from './collections/VendorMedia'
import { Enquiries } from './collections/Enquiries'
import { Products } from './collections/Products'
import { Contacts } from './collections/Contacts'
import { Reminders } from './collections/Reminders'
import { WhatsAppContacts } from './collections/WhatsAppContacts'
import { WhatsAppMessages } from './collections/WhatsAppMessages'
import { WhatsAppCampaigns } from './collections/WhatsAppCampaigns'
import { Runs } from './collections/Runs'
import { ReferralVisits } from './collections/ReferralVisits'
import { SiteSettings } from './globals/SiteSettings'
import { ReminderSettings } from './globals/ReminderSettings'
import { RewardSettings } from './globals/RewardSettings'

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
    components: {
      // Zenfest emblem + wordmark instead of the Payload logo (login page, nav, breadcrumb).
      graphics: {
        Logo: '/components/admin/BrandGraphics#AdminLogo',
        Icon: '/components/admin/BrandGraphics#AdminIcon',
      },
      // Occasion reminders to send today, then gift-registry numbers (events, gifts, clicks, leads).
      beforeDashboard: [
        '/components/admin/UpcomingOccasions#UpcomingOccasions',
        '/components/admin/RegistryStats#RegistryStats',
      ],
    },
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
    Testimonials,
    Leads,
    Signups,
    VendorApplications,
    PhoneVerifications,
    VendorUploads,
    HostApplications,
    RegistryEvents,
    RegistryItems,
    RegistryClaims,
    RegistryClicks,
    RegistryGuests,
    RegistryLeads,
    Polls,
    PollVotes,
    PollVoters,
    AiConversations,
    Vendors,
    Customers,
    VendorMedia,
    Enquiries,
    Products,
    Contacts,
    Reminders,
    WhatsAppContacts,
    WhatsAppMessages,
    WhatsAppCampaigns,
    Runs,
    ReferralVisits,
  ],
  globals: [SiteSettings, ReminderSettings, RewardSettings],
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
    // otherwise Payload uses the local filesystem (local dev). The plugin is registered
    // either way: it adds an admin provider that must be in the import map, and a map
    // generated without it left the live admin blank (every page under the provider
    // renders nothing when its component is missing).
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      // Vendor uploads (FSSAI certificates) stay behind Payload's access
      // control: they're served via /api, not straight from the Blob URL.
      collections: { media: true, 'vendor-uploads': true, 'vendor-media': true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
})
