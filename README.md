# Zenfest Events — Website (V1)

Marketing & lead-generation site for Zenfest Events, a full-service event
management company near Chennai. Built with **Next.js (App Router)** and
**Payload CMS 3** in a single codebase: the public site and the self-service
admin/back-end share one deployment.

- **Public site:** home, gallery (Our Work), services, packages, about, contact
  (inquiry form), vendor enrollment.
- **Admin panel:** `/admin` — manage the gallery, services, packages, site
  settings, and view/handle incoming leads and vendor applications.
- **Database:** SQLite locally (zero setup), Postgres (Neon) in production —
  auto-selected from the `DATABASE_URI` env var.
- **Media:** local filesystem locally, Vercel Blob in production (when
  `BLOB_READ_WRITE_TOKEN` is set).

> Scope note (V1): no client login, payments, or client portal — by design.
> The `/admin` login is for the business owner/team only.

## Requirements
- Node.js ≥ 20.9
- npm

## Local development
```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
#    then set PAYLOAD_SECRET (any long random string):
#    openssl rand -hex 32
#    Leave DATABASE_URI as the sqlite default for local dev.

# 3. (Optional) Seed demo content — categories, services, packages and a
#    sample gallery with brand-coloured placeholder images.
npm run seed

# 4. Start the dev server
npm run dev
```
Then open:
- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (create the first admin user on first visit)

Useful scripts:
- `npm run generate:types` — regenerate `src/payload-types.ts`
- `npm run generate:importmap` — regenerate the admin import map
- `npm run seed` — seed demo content (set `FORCE_SEED=1` to re-run over existing data)

## How leads work
The inquiry form and vendor form POST to Payload's REST API and store each
submission in the database (visible under **Leads** and **Vendor Applications**
in `/admin`). When SMTP is configured (see `.env.example`), a notification email
is also sent to `LEAD_NOTIFICATION_EMAIL`. Every page also offers Call and
WhatsApp actions, since that's how most clients get in touch.

## Production (Vercel + Neon + Vercel Blob)
1. Create a **Neon** Postgres database; copy its **pooled** connection string
   (the one whose host contains `-pooler`) — serverless functions open many short
   connections, and the pooler is what keeps Neon from running out of them.
2. Create a **Vercel Blob** store; copy its read/write token.
3. Import the repo into **Vercel** and set env vars:
   - `PAYLOAD_SECRET` — long random string
   - `DATABASE_URI` — the Neon Postgres connection string (starts with `postgres`)
   - `NEXT_PUBLIC_SERVER_URL` — your site URL (no trailing slash). This feeds
     `serverURL`, CORS and CSRF, so a wrong value makes the admin panel and the
     public forms fail even though the build succeeds.
   - `BLOB_READ_WRITE_TOKEN` — the Vercel Blob token
   - (optional) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
     `LEAD_NOTIFICATION_EMAIL`
4. Deploy, then open `/admin` to create the first admin user.

### Database migrations (required in production)
Locally, the SQLite adapter pushes schema changes automatically. **Postgres in
production does not** — Payload only pushes when `NODE_ENV !== 'production'`, so
without migrations the build succeeds and every page then 500s on missing tables.

`vercel.json` therefore sets the build command to `npm run build:vercel`, which is
`payload migrate && next build`: migrations run against Neon on every deploy,
before the app is built, and a failed migration fails the deploy.

After changing any collection or global:
```bash
npm run migrate:create   # writes a new file into src/migrations (no DB needed)
npm run generate:types   # refresh src/payload-types.ts
```
Commit the generated migration — the deploy is what applies it. `npm run migrate`
and `npm run migrate:status` run against whatever `DATABASE_URI` points at, so set
it to the Neon string first if you want to apply or inspect migrations by hand.

### Content does not travel with the code
The local `zenfest.db` and the local `media/` folder are gitignored and are *not*
copied to production. After the first deploy the Neon database is empty: create the
admin user at `/admin`, then either re-enter content there or point `DATABASE_URI`
at Neon and run `npm run seed` once to load the demo content.

## Design
Visual direction and tokens are documented in [DESIGN.md](DESIGN.md). Signature
motif: **kolam** (Tamil threshold line-art). Fonts: **Oswald** (display) +
**Hanken Grotesk** (body), loaded via `next/font/google` (self-hosted).

## Project structure
```
src/
  app/(frontend)/   Public site (pages, layout, styles)
  app/(payload)/    Payload admin (generated)
  collections/      Users, Media, Categories, Services, Packages, Projects,
                    Leads, Signups, VendorApplications
  globals/          SiteSettings
  components/       Header, Footer, MobileCTABar, Kolam, GalleryGrid, forms…
  lib/              Payload client, site settings, media helpers
  seed/             Demo-content seed script
  payload.config.ts
```
