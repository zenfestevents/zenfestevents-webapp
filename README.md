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

> Accounts: the `/admin` login is for the business owner/team. Vendors and couples have
> their own logins (`/vendors/login`, `/account/login`) for the vendor marketplace.
> No online payments yet.

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
- `npm run seed:ai` — add sample Zenfest AI options and prices to the local services
  (local demo only; enter real prices in the live admin)
- `npm run seed:marketplace` — add 4 live demo vendors (with placeholder photos) and one
  demo couple to the **local SQLite** database. The demo logins and their password are in
  `src/seed/marketplaceDemo.ts`. It refuses to run against Postgres.

## How leads work
The inquiry form and vendor form POST to Payload's REST API and store each
submission in the database (visible under **Leads** and **Vendor Applications**
in `/admin`). When SMTP is configured (see `.env.example`), a notification email
is also sent to `LEAD_NOTIFICATION_EMAIL`. Every page also offers Call and
WhatsApp actions, since that's how most clients get in touch.

### Vendor marketplace (vendor + couple accounts)
- **Vendors** sign up at `/vendors/signup` (free), build their listing in
  `/vendors/dashboard`, and press **Send for review**. The team gets an email, opens
  **Admin → Marketplace → Vendors**, checks the listing and sets **Listing status → Live**
  (or **Needs changes** with a note the vendor sees). Photo and cake vendors also answer the
  usual questionnaire, which still lands in **Vendor Applications** and Airtable.
- **Couples** sign up at `/account/signup`, browse `/marketplace`, shortlist (♡) and send
  **Request a quote**. The vendor is emailed, replies from the dashboard (optionally with a
  quote), and can mark it booked (which blocks the date). The couple sees the vendor's
  phone once they reply. "Plan with Zenfest" in the couple's account turns their shortlist
  into a **Lead** for the planning team.
- Everything is also in the admin: **Customers**, **Marketplace Enquiries**, **Vendor
  Photos**. Logging in as a vendor or couple in the same browser logs you out of `/admin`.
- **New accounts confirm their email** before they can log in (a link is emailed at
  sign-up; the login page offers "Resend the confirmation email"). This needs SMTP: in
  production without `SMTP_*`, accounts are created already confirmed so nobody is locked
  out. **Password resets need SMTP in production** too. Locally, both links are printed in
  the dev-server console.
- **Continue with Google** (vendors and couples) appears on the log-in / sign-up pages
  once `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set. New Google users fill a short
  "finish signing up" form (phone, business…); an existing email account is linked on its
  first Google sign-in.

### Gift registry
Families make a free registry at `/registry/create` and share `/r/<slug>` with guests.
There are no host accounts: each registry gets a secret **manage link**
(`/dashboard/<slug>?key=…`), shown once on creation and emailed to the host if they
give an email. Only its hash is stored, so **a lost link can't be recovered** — if a
family loses it, create a new key from the server (or recreate the registry).

- Every new registry and every "Plan with Zenfest" banner submission lands in `/admin`
  under **Gift Registry** (Registries, Registry leads) and triggers the usual
  notification email. Phone numbers there are one-tap WhatsApp links.
- Guests claim gifts ("I'll gift this"); a claim reserves the gift for everyone. Admin
  can free a gift by deleting its row in **Gift claims**.
- Shagun goes straight to the host's own UPI ID (a QR + `upi://` link). Zenfest never
  handles the money.
- Store links get affiliate tags from `AMAZON_ASSOCIATE_TAG` /
  `AFFILIATE_REDIRECT_TEMPLATE` (see `.env.example`); clicks are logged in
  **Store clicks**.

### Polls
Public polls live at `/polls` (live), `/polls/closed` (results) and `/polls/<slug>`; the
featured one also shows on the homepage. Create them in `/admin` → **Polls**: set the
question, category, 2–8 options, **Status = Open**, and optionally **Closes at** (polls
close by themselves). Each poll can carry a sponsor and its own call to action; otherwise
a category default points to the matching Zenfest service.

- **One person, one vote:** a voter is a phone number. While WhatsApp verification is
  live (see "Phone verification"), voters prove their number once and a cookie keeps them
  signed in; until then votes are phone-only and counted as *unverified* (results show
  "N votes · M verified"). Another provider (SMS OTP) can be added in
  `src/lib/voterVerification.ts`.
- **Leads:** `/admin` → Polls → **Voters**. Only contact people with *Agreed to updates*
  ticked — the box is unticked by default (DPDP Act).
- **Election polls:** tick *Election-related* to hide results while the poll is open,
  and close such polls during the Election Commission's silence period.
- **Families** can also add polls to their gift registry (dashboard → Polls); guests vote
  once per device with no phone check.
- **Old site:** `polls.zenfestevents.in` redirects here (`next.config.ts`) once that domain
  is added to this Vercel project and its DNS points at Vercel instead of Firebase.

### Vendor applications → Airtable
Photography vendor applications are also copied, one row each, into an Airtable
base (hook: `src/hooks/syncToAirtable.ts`). The row is added after the application
is saved, so an Airtable problem never loses a submission — it just logs a warning.
It uses one API call per application (the free plan allows ~1,000 a month; a base
holds 1,000 records).

One-time setup:
1. In Airtable, create a workspace **Photo**. In it, create a base by
   **importing** `docs/airtable/photo-vendors.csv` (it only has the column
   headings). Name the base **Photo Vendors** and the table **Vendor Applications**.
   Change the `Date` column to a **Date** field; the rest can stay as they are.
2. Create a personal access token at <https://airtable.com/create/tokens> with the
   scope `data.records:write`, and give it access to the **Photo Vendors** base only.
3. Copy the base ID (the `app…` part of the base's URL) and set, in `.env` locally
   and in Vercel for production: `AIRTABLE_TOKEN`, `AIRTABLE_PHOTO_BASE_ID`, and
   `AIRTABLE_PHOTO_TABLE` if the table isn't named `Vendor Applications`.

Column names must match the ones the hook sends; if you rename a column in
Airtable, rename it in the hook too.

**Cake applications** go to the existing **Cake Vendors** base (Bakers
workspace), laid out like the team's hand-entered rows: one **Vendors** row with
Status *To Call* and the FSSAI certificate attached, plus one **Flavour Prices**
row per flavour (`src/hooks/syncCakeToAirtable.ts`). Answers without their own
column (e.g. "tier charge is per kg", "menu card uploaded") go into *Risk Notes*.
Set `AIRTABLE_CAKE_BASE_ID` (`appcZifMTnWKniVOR`) and make sure the token above
also has access to that base.

The cake questions are the base's **Intake Questions** marked *Approved 10*.
FSSAI registration and delivery are hard filters: the form asks those two first
and tells bakers without them to come back once they have them, and the server
refuses cake applications without a 14-digit FSSAI number, a certificate upload,
delivery rates and at least 3 flavours. Certificates and menu cards are stored
in the private **Vendor Uploads** collection (admin-only; 4 MB max; images or PDF).

### Zenfest AI (the AI event planner)
A multi-agent planner on **open-source models**: **Zenfest** (the coordinator) talks
to the customer and hands each service to a **specialist agent** (Décor, Kitchen,
Lens, Beats…) that knows only that service. Each specialist's answer is shown to the
customer as its own card; estimates are added up **in code** from the price ranges
in the admin, never by the AI.

**Every chat starts with a short intake form** (4 steps, every field required): type
of event; who is planning (bride / groom / family member + relation / friend, or host /
organiser for other events); for weddings, which functions (Nichayathartham, Mehendi,
Haldi, Sangeet, Muhurtham, Reception) with a **month for each** (exact date optional),
otherwise one month/date; where; guests; at least one service or **Complete event
planning**; name and phone; then a Confirm step that names the specialists and offers to
add more services. Zenfest is given these answers on every reply, so it never asks for
them again, and remembers new details (budget, theme, venue) as the chat goes on.
Customers can reopen their earlier chats from **Chats** in the chat header. Sending it **saves a Lead at once** (`source = zenfest-ai`, the answers
in the message, the AI plan attached and kept up to date) and triggers the usual
notification — so the team has the basics even if the customer leaves. The server then
consults the chosen specialists itself and Zenfest continues the chat from there.

- **Models (hosted on Groq, chosen by testing real chats):** the coordinator runs
  Alibaba's **Qwen 3.8 27B** (`qwen/qwen3.8-27b`) — fastest, most natural Tamil/Tanglish,
  routes to specialists straight away. Every specialist runs OpenAI's **GPT-OSS-120B**
  (`openai/gpt-oss-120b`) — the smaller 20B mixed up options and ignored budgets.
  Qwen is a Groq *preview* model, so when it is unavailable or out of free quota Zenfest
  automatically answers with GPT-OSS-120B (`AI_COORDINATOR_FALLBACK_MODEL`). Any
  OpenAI-compatible host works — change `AI_BASE_URL` / `AI_*_MODEL`.
- **Switching it on:** create a free key at console.groq.com (no credit card) and set
  `AI_API_KEY`. Without it, or with the kill switch in **Site Settings → Zenfest AI**
  unticked, every AI button falls back to the contact page and the site looks as before.
- **Free-tier limits:** roughly 1,000 requests / ~200K tokens a day *per model* — the
  coordinator and specialists use different models, so each has its own quota; about
  5–10 full planning chats a day. When Groq says "too many requests", the chat shows
  "our planners are busy, leave your number", so the lead is still captured. For more,
  add a card on Groq (pay as you go, roughly ₹2–5 per full chat with Qwen as the
  coordinator, ~₹1 if `AI_COORDINATOR_MODEL=openai/gpt-oss-120b`).
- **Where it shows:** a "Meet Zenfest AI" band under the homepage hero, a gold bubble
  on every desktop page, the gold middle button of the phone bottom bar, the header
  and phone menu, the hero buttons, and the shareable full-screen page `/plan`.
- **What the specialists know:** `/admin` → Services → open a service → **Zenfest AI
  specialist**. Tick "AI specialist enabled", give it a name and emoji, and enter
  **options with price ranges** (per event / plate / hour / person), rules and FAQs. A
  service with no options says "our team will advise" instead of guessing. Adding a
  service and ticking the box creates a new specialist — no code change.
- **Limits:** per-IP rate limits, 30 messages per chat, and `ZENFEST_AI_DAILY_USD_CAP`
  (default 5 USD/day, only relevant on a paid plan).
- **Reviewing chats:** `/admin` → **Zenfest AI chats** shows every conversation as the
  customer saw it.
- **Local demo data:** `npm run seed:ai` adds sample options and prices to the seeded
  services (local only — enter real prices in the live admin).

### Phone verification (WhatsApp)
The vendor form proves the phone number belongs to the applicant without paying
for SMS. The vendor taps **Verify on WhatsApp**; WhatsApp opens with
`ZENFEST VERIFY 482913` addressed to our number (laptops also get a QR code to
scan with the phone). When they press Send, Meta calls our webhook, which marks
the number verified only if WhatsApp reports **that same number** as the sender.
Messages people send to a business are free, so there's no per-check cost.

Code: `src/collections/PhoneVerifications.ts` (endpoints `/api/phone-verifications/start`,
`/status`, `/webhook`, `/simulate`), `src/components/PhoneVerify.tsx` (the form
widget), `src/hooks/requireVerifiedPhone.ts` (the server check on submit). Codes
last 10 minutes, work once, and a number can request 5 per hour.

Modes, picked automatically from env:
- **live**: `WHATSAPP_BUSINESS_NUMBER` and `WHATSAPP_APP_SECRET` are set.
- **test** (local dev, not set): a *Simulate WhatsApp send* button stands in for the message.
- **off** (production, not set): no verification; the form works as before.

One-time Meta setup (free):
1. Go to <https://developers.facebook.com/apps> → **Create app** → type **Business**,
   and add the **WhatsApp** product. This also creates a Meta Business account if you
   don't have one.
2. In **WhatsApp → API setup**, add the business phone number and verify it by SMS or
   call. The number must be on the Cloud API: use 9080089530 if Meta offers to connect
   it alongside the WhatsApp Business app, otherwise use a spare number that isn't on
   WhatsApp.
3. In **WhatsApp → Configuration → Webhook**, set the callback URL to
   `https://www.zenfestevents.in/api/phone-verifications/webhook`, enter your
   `WHATSAPP_VERIFY_TOKEN` (any long random string), click **Verify and save**, then
   subscribe to the **messages** field. (The site must already be deployed with that
   token set, or the handshake fails.)
4. In Vercel, set `WHATSAPP_BUSINESS_NUMBER` (e.g. `919080089530`),
   `WHATSAPP_APP_SECRET` (**App settings → Basic**) and `WHATSAPP_VERIFY_TOKEN`.
   Optionally set `WHATSAPP_ACCESS_TOKEN` (a permanent system-user token) and
   `WHATSAPP_PHONE_NUMBER_ID` (shown on API setup) to send a free "Verified ✓" reply.
   Redeploy.
5. Publish the app (switch it from Development to **Live**) so messages from any
   number reach the webhook, then test from a phone.

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
   - (optional, but **required for vendor/couple password resets** and marketplace
     emails) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
     `LEAD_NOTIFICATION_EMAIL`
   - (optional) `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — "Continue with Google" for
     vendor/couple accounts (redirect URI `https://www.zenfestevents.in/auth/google/callback`)
   - (optional) `AIRTABLE_TOKEN`, `AIRTABLE_PHOTO_BASE_ID`, `AIRTABLE_PHOTO_TABLE`
     — see "Vendor applications → Airtable"
   - (optional) `WHATSAPP_*` — see "Phone verification (WhatsApp)"
   - (optional) `AI_API_KEY` (free Groq key) and the other `AI_*` settings — turns on
     Zenfest AI (see "Zenfest AI")
   - (optional) `AMAZON_ASSOCIATE_TAG`, `AFFILIATE_REDIRECT_TEMPLATE` — gift-registry
     affiliate links (see "Gift registry")
4. Deploy, then create the first admin user (see below) and sign in at
   `/admin/login`.

### Creating the first admin user
**Do not use `/admin/create-first-user`.** On Payload 3.88 + Next 16.3.3 that one
screen renders blank: the view reaches the RSC stream but never the DOM. It
reproduces locally against an empty database under both Turbopack and webpack, so
it is not a deploy, bundler or database problem. Every other admin screen —
login, dashboard, all collections and globals — renders correctly.

Seed the first user from the command line instead, with `DATABASE_URI` pointed at
the target database:
```powershell
$env:DATABASE_URI="postgres://...(your Neon pooled string)"
$env:ADMIN_EMAIL="you@example.com"
$env:ADMIN_PASSWORD="a long password"
npm run create:admin
```
Then sign in at `/admin/login`. The script refuses to run if a user already
exists, and reports whether it hit Postgres or SQLite so you can confirm you
targeted the right database. Shell variables win over `.env`, which is left
untouched — open a new terminal to go back to local SQLite.

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
`migrate:create` must see a `postgres…` `DATABASE_URI` (the local SQLite default makes it
fail on the Postgres snapshots); it never connects, so a placeholder works — in PowerShell:
`$env:DATABASE_URI='postgres://u:p@127.0.0.1:5432/none'; npm run migrate:create <name>`.
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
