# CLAUDE.md

Guidance for working in this repository.

## Project
Zenfest Events — an event company near Chennai growing from a marketing site into a
wedding/event **web app** (an ecosystem: fund → plan → book → guests → run the day → after).
Public site + a self-service admin/back-end in one codebase. Business model has two lanes:
**DIY couples book vendors themselves on the marketplace**; couples who want a planner hand
off to the Zenfest team (Leads). There are **three kinds of login**, all Payload auth:
admin/staff (`users`, `/admin`), **vendors** (`vendors`, `/vendors/*`) and **couples**
(`customers`, `/account/*`) — see "Vendor marketplace" below. Still no payments. The gift
registry (secret host link) and **Zenfest AI** (chat token in the browser) predate accounts
and don't use them yet; Zenfest AI's intake has the slot for profile name/phone. See
[README.md](README.md) for setup and [DESIGN.md](DESIGN.md) for the visual direction.

## Stack
- **Next.js 16.3.3** (App Router) + **Payload CMS 3.88.0** in the same app
- **React 19.2.6**, **TypeScript 6.0.3**
- **Database:** SQLite locally (auto-created as `zenfest.db`), Postgres (Neon) in
  production — auto-selected in `src/payload.config.ts` from `DATABASE_URI` (a value
  starting with `postgres` uses Postgres, otherwise SQLite)
- **Media:** local filesystem locally, Vercel Blob in production (enabled only when
  `BLOB_READ_WRITE_TOKEN` is set)
- **Email:** nodemailer via `@payloadcms/email-nodemailer`, enabled only when
  `SMTP_HOST` is set; otherwise submissions still save and the notification is logged
  to the console
- Pinned versions — keep all `@payloadcms/*` packages on **3.88.0** (all must match);
  Next.js, React, and other deps are pinned in `package.json`.

## Commands
```bash
npm run dev              # dev server (Turbopack) at http://localhost:3000
npm run devsafe          # dev with .next cache cleared (use if Turbopack fails)
npm run build            # production build
npm run start            # run production build locally
npm run seed             # seed demo content (FORCE_SEED=1 to re-run over data)
npm run seed:ai          # add sample Zenfest AI options/prices to local services (never prod)
npm run seed:marketplace # 4 live demo vendors + 1 couple, local SQLite only (logins in src/seed/marketplaceDemo.ts)
npm run migrate:create   # new Postgres migration after schema changes (needs a postgres DATABASE_URI, no DB)
npm run generate:types   # regenerate src/payload-types.ts after schema changes
npm run generate:importmap  # regenerate the admin import map
npm run lint             # run ESLint
npm run payload          # run Payload CLI commands
```

## Architecture
```
src/
  app/(frontend)/
    page.tsx              Homepage: hero + featured work + services
    about/page.tsx        About page
    gallery/page.tsx      Gallery (Our Work) — all projects
    services/page.tsx     Services listing
    packages/page.tsx     Bundled packages (PACKAGES_READY flag)
    contact/page.tsx      Contact form (inquiry)
    signup/page.tsx       Signup / offer form (branches on "planning an event?")
    vendors/              /vendors landing (VENDOR_ACCOUNTS flag; old VendorForm kept),
                          signup, login, forgot/reset-password, dashboard, actions.ts
    account/              Couple account: /account (enquiries, shortlist, planner
                          hand-off, profile), signup, login, forgot/reset-password,
                          session/route.ts (header button), actions.ts
    marketplace/          /marketplace, /marketplace/[category] (+ 'all'),
                          /marketplace/v/[slug] (vendor listing + quote form)
    earn/page.tsx         "Earn from events" — families apply to host foreign guests
    plan/                 Zenfest AI: full-screen chat page, chat/route.ts (NDJSON
                          stream; kickoff after the intake), actions.ts (startChat =
                          intake → conversation + Lead, contact card, loadChat)
    layout.tsx            Root layout, Header, Footer, MobileCTABar
    styles.css            Design tokens (colors, typography, spacing)
    parts.css             Component & section styles
    registry.css, polls.css, ai.css, marketplace.css   Feature styles (imported in that order)
  app/(payload)/        Payload admin (generated boilerplate — avoid hand-editing)
  collections/          Users, Media, Categories, Services (+ `ai` specialist group),
                        Packages, Projects, Leads, Signups, VendorApplications,
                        HostApplications, registry-*, polls / poll-votes / poll-voters,
                        AiConversations (Zenfest AI chats), Vendors + Customers (auth),
                        VendorMedia, Enquiries (marketplace)
  globals/              SiteSettings
  components/
    Header.tsx, Footer.tsx, MobileCTABar.tsx
    Kolam.tsx            Kolam line-art (KolamRosette, KolamDivider)
    GalleryGrid.tsx      Gallery grid component
    Reveal.tsx           Scroll-in animation (fade/rise)
    ScrubHero.tsx        Full-bleed scroll-scrubbed hero
    InquiryForm.tsx, VendorForm.tsx, SignupForm.tsx  Forms
    ai/                  Zenfest AI UI: ZenfestAIProvider (state, chat history),
                         ZenfestChat, IntakeForm, ChatLauncher (bubble + AiLink),
                         MeetZenfestAI (homepage band)
    market/              Marketplace + accounts UI: AuthForm/AuthShell, AccountButton
                         (header), VendorDashboard, AccountDashboard, VendorCard,
                         QuoteForm, EnquiryThread, MonthCalendar, SearchBar
  lib/
    payload.ts           Payload client (server-side)
    getSettings.ts       getSiteSettings() (server-side, merges fallback)
    site.ts              Client-safe exports (types, helpers, fallbacks)
    media.ts             Media URL helpers
    ai/                  Zenfest AI (server-only except types.ts / intake.ts):
                         config (models, limits), client (OpenAI-compatible),
                         orchestrator (Zenfest), specialist, knowledge (from
                         Services), conversation (storage, lead plan), intake
                         (form rules), status (aiAvailable), types
    session.ts           Who is logged in (server-only): getVendor/getCustomer,
                         requireVendor/requireCustomer, session cookie helpers
    authActions.ts       'use server' sign-up / log-in / log-out / forgot / reset
    marketplace.ts       Server-only privacy boundary: PublicVendor DTOs, enquiries
    marketplaceOptions.ts, listing.ts, formCheck.ts   Client-safe options/validators
  seed/                  Demo-content seed script (+ aiDemo.ts for Zenfest AI,
                         marketplaceDemo.ts for demo vendors/couple)
  access/                Access control for collections
  fields/                Custom Payload field types
  hooks/                 Payload hooks (e.g., notifySubmission)
  payload.config.ts      Payload configuration
```
- **Public pages** fetch content through Payload's **Local API** (`getPayloadClient()`),
  marked `export const dynamic = 'force-dynamic'`. Pages: home (featured work + services),
  gallery (all projects), services (all services), packages (with "Coming soon" flag),
  about, contact, signup (with event-planning branch), vendors, plan (Zenfest AI).
- **Forms** (`InquiryForm`, `VendorForm`, `SignupForm`) POST to Payload's REST API
  (`/api/leads`, `/api/vendor-applications`, `/api/signups`). Public users **create**
  submissions; only admin can **read** them (see `src/access/index.ts`). New submissions
  trigger the `notifySubmission` hook (sends email to `LEAD_NOTIFICATION_EMAIL` when
  SMTP is configured; logs to console otherwise). All submissions auto-save to the DB.
  **Photography** vendor applications are also copied to Airtable by
  `hooks/syncToAirtable.ts` (one base, one row per application, `Date` column; skipped
  when `AIRTABLE_TOKEN` / `AIRTABLE_PHOTO_BASE_ID` are unset). Its column names must
  match the Airtable table — template in `docs/airtable/photo-vendors.csv`. Vendor
  option lists shared by form, collection and hook live in `lib/vendorOptions.ts`.
  **Cake** applications go to the existing Cake Vendors base (`AIRTABLE_CAKE_BASE_ID`)
  via `hooks/syncCakeToAirtable.ts`, matching its Vendors / Flavour Prices columns
  and dropdown choices; the FSSAI certificate is sent as bytes (uploadAttachment)
  because `vendor-uploads` files are private. The cake questions
  (`components/CakeFields.tsx`) are that base's "Approved 10" intake questions;
  FSSAI + delivery are hard filters enforced in the form and by `requireCakeBasics`.
  Keep `requireVerifiedPhone` **last** in `beforeChange` — it consumes the one-time
  proof, so any validation after it would burn a vendor's verification on failure.
- **Phone verification (vendor form)** is WhatsApp "reverse" verification: the
  visitor sends `ZENFEST VERIFY <code>` to our number and Meta's webhook
  (`collections/PhoneVerifications.ts`, `/api/phone-verifications/webhook`) marks it
  verified only if the sender matches the typed number. `components/PhoneVerify.tsx`
  is the reusable widget; `hooks/requireVerifiedPhone.ts` consumes the proof on create
  and sets `phoneVerified`. Mode comes from `verifyMode()` in `lib/phoneVerification.ts`
  (server-only): **live** when `WHATSAPP_BUSINESS_NUMBER` + `WHATSAPP_APP_SECRET` are
  set, **test** in dev (a Simulate button), **off** in production otherwise (no
  verification, so deploying without Meta set up doesn't break the form). Pages that
  use it must be `force-dynamic` so the mode is read at request time.
- **`getSiteSettings()`** merges `SITE_FALLBACK` into the CMS-stored global, filling
  blank fields with sensible defaults. Components read `settings.contact.whatsapp`
  directly; without this merge an empty admin field would silently hide every WhatsApp
  button. Admin values still override fallbacks.

## Conventions & gotchas
- **Client/server boundary (important):** `src/lib/site.ts` must stay client-safe
  (types, `whatsappLink`, `telLink`, `SITE_FALLBACK`, `DEFAULT_WA_MESSAGE`). Anything
  that touches the Payload server library goes in `src/lib/getSettings.ts` or
  `src/lib/payload.ts`. A client component importing (even transitively) the Payload
  client breaks the build with `Can't resolve 'fs'` and a Turbopack manifest error.
- **Styling:** plain CSS design system. Tokens live in `styles.css`; component/section
  styles in `parts.css`. Use the existing CSS variables and class prefixes; avoid
  adding a CSS framework.
- **Scroll animation:** two patterns — `components/Reveal.tsx` (IntersectionObserver,
  one-shot fade/rise for section reveals) and `components/ScrubHero.tsx` (the homepage
  hero). The scrub sets an inherited `--p` (0→1) CSS variable on the **outermost**
  element via a `requestAnimationFrame`-throttled scroll handler; CSS maps `--p` to
  transforms/opacity with `clamp()`. Set `--p` on the top element so every child (glow,
  hearts, line, hint) inherits it. Both patterns respect `prefers-reduced-motion`.
- **The hero (`ScrubHero`)** is full-bleed: the reception film fills the viewport and is
  scrubbed by scroll, with the gold heart halves meeting as it ends. **Phones
  (≤720px, `MOBILE_QUERY`) get a still instead** — touch-scrubbing a film was laggy and
  cost a 20 MB download — reusing the reduced-motion layout. The still is a ChatGPT team
  image with its speech bubble baked in (`public/hero/poster-mobile-860.webp` / `-1290.webp`,
  from the untracked master `hero-mobile-source.png.png`), shown **whole, full width, just
  under the header** — cropping it to fill the screen cut people off and hid the bubble
  under the header. Heart/kolam-rosette/glow/outro/scrim are hidden. Under the image, a
  dark band holds (in order) the eyebrow, headline, lede and a `KolamDivider`
  (`.scrubhero__divider`, phones only); the desktop buttons and tags are hidden there —
  **phone actions live in `MobileCTABar`, never in the hero**. All of it is the last
  `@media (max-width: 720px)` block in `parts.css`. Regenerate the image with
  `ffmpeg -i hero-mobile-source.png.png -vf scale=1290:-2:flags=lanczos -c:v libwebp -quality 78 public/hero/poster-mobile-1290.webp`
  (and 860). WebP, not JPEG: the busy petals/sparks made the JPEGs twice the size.
  Things that are easy to get wrong here:
  - `--p` **reaches 1 while the stage is still pinned** and filling the screen. To act on
    "the film has actually left", test `section.getBoundingClientRect().bottom`, not `--p`.
  - The hero is pulled up under the fixed header with a negative margin, so **`--p` is
    already non-zero at rest**. Use `window.scrollY` to test "has scrolling started".
  - `.scrubhero__content` is bottom-anchored with its **top bounded by `--header-h`** —
    left unbounded it grows up under the fixed header (higher z-index) and swallows the
    eyebrow. The hero headline also overrides `.display-xl`, which is sized for a full
    section and overruns a laptop viewport.
  - Media loads **non-blocking**: a poster paints instantly, the video is fetched into a
    Blob URL behind it (blob URLs stay seekable even when the server ignores HTTP Range),
    iOS gets a WebP frame sequence instead, and metered/slow connections
    (`navigator.connection.saveData` / `effectiveType`) never download it at all.
- **Header:** `position: fixed` (not sticky) — a sticky bar occupies layout space, which
  pushed the hero's `100svh` stage down and cropped the film. `#main` pays back the
  offset via `--header-h` and the hero cancels it. The bar hides over the hero
  (`body.hero-immersive`) and returns as the film leaves. Phones show the emblem **and**
  the "ZENFEST EVENTS™" wordmark (it used to be hidden below 420px). Desktop holds nine
  links (Marketplace first) + "✦ Zenfest AI" (≥1440px) + "For Vendors" + the account
  button (icon-only below 1440px), so the bar collapses to the hamburger **below 1200px**
  and its inner container may run to 1400px (wider than the 1200px content column).
  Adding a tenth link means re-measuring 1200 / 1280 / 1440.
- **Mobile bottom bar (`MobileCTABar`, <900px, every page except the registry's `/r/*`, `/dashboard/*` and `/plan`):** Earn from events
  (`/earn`, ivory) · **Ask Zenfest AI** (gold "zari" sheen — `zari-sheen` keyframes; opens
  the AI chat full-screen, and falls back to "Enquire" → `/contact` when the AI is off) ·
  Enroll as a vendor (`/vendors`). No Call button by the owner's choice; WhatsApp was
  swapped out for Earn from events (here and in the desktop hero's buttons) — it is
  still on the homepage's other sections and `/contact`. The sheen stops under
  `prefers-reduced-motion`.
- **Polish rules (see DESIGN.md "Surfaces & details"):** page heads get the rosette
  watermark automatically via `.section:has(> .container > .page-head)::before` — wrap new
  light page intros in `<header className="page-head">` to get it. `.band-ink` now sets a
  `background` with grain + glow, so a class that needs its own background must set it
  after. The gallery is a CSS grid (cards crop to 4:3), not CSS columns — columns left
  ragged holes. `svc-grid` uses 6 tracks so a short last row stretches. Footer links are
  split into "Plan your event" / "Zenfest"; the footer logo uses `mix-blend-mode: lighten`
  to hide its black square. `(frontend)/not-found.tsx` is the branded 404. Don't run
  Prettier on files — the repo has no config, so it rewrites quotes/semicolons.
- **`KolamDivider` needs `.kolam-divider path/circle` in `styles.css`** for its stroke;
  before that rule existed, dividers on Home/About/Services rendered as filled black blobs.
- **Media URLs are made root-relative** by `mediaUrl()` in `src/lib/media.ts`. Payload
  prefixes local uploads with `serverURL` (`http://localhost:3000` in dev), which broke
  every photo on any other host; Vercel Blob URLs pass through untouched.
- **Testing on a phone over Wi-Fi:** open `http://<this PC's LAN IP>:3000`. That IP must
  be in `allowedDevOrigins` in `next.config.ts` (currently `192.168.1.3`), or Next 16
  blocks the dev JS chunks for it — the page renders but nothing hydrates (dead menu,
  sections that never reveal). Dev-only; update it if the LAN IP changes.
- **Local DB has seed demo projects** ("TechCorp Annual Day" etc., placeholder art with
  titles baked in), so locally "Photos do the talking" shows those cards. Production's
  Neon DB has none, so the live site shows the automatic "Coming soon" panel until real
  projects are added in the live `/admin`.
- **Hero video assets** live in `public/hero/` (`scrub.mp4`, `poster.jpg`,
  `frames/frame_001..090.webp`); masters stay untracked at the repo root. Regenerate from
  `hero_master.mp4` (1920×1080):
  ```bash
  ffmpeg -i hero_master.mp4 -an -r 15 -vf scale=1920:-2 -c:v libx264 -profile:v high \
    -pix_fmt yuv420p -g 5 -keyint_min 5 -sc_threshold 0 -crf 28 -preset veryslow \
    -tune film -movflags +faststart public/hero/scrub.mp4
  ```
  Keyframes every 5 frames (~0.33s) keep seeking instant while costing ~30% less than
  all-intra; that saving pays for 1080p. Re-encode from the **master**, never from
  `public/hero/scrub.mp4`, or you compress an already-compressed file.
- **Text over film:** no text shadow survives the film's blown-out highlights. Use the
  contained `.scrubhero__hl` highlight (a band that hugs the text, cloned per line) or
  the tag chips. A full-width gradient wash was tried and rejected — it darkened the
  whole frame and hid the footage.
- **Fonts:** Oswald (display) + Hanken Grotesk (body) via `next/font` — derived from
  the logo. Accent words use gold (`.accent` / `.italic`), not italics.
- **Brand assets:** source logo is `brand/logo-source.webp`. Run
  `node build-brand-assets.cjs` to regenerate the header emblem
  (`public/brand/emblem.png`, circular/transparent), footer lockup
  (`public/brand/logo-full.png`), and favicon (`src/app/icon.png` + `apple-icon.png`).
  The header is dark so the gold-on-black logo sits naturally.
  `public/brand/wordmark.png` (the gold "ZENFEST EVENTS" lockup used in the header, with
  a transparent background) is **not** produced by that script — it was extracted from
  `logo-full.png` and will not be rebuilt if the source logo changes.
- **Signature motif:** kolam line-art (`components/Kolam.tsx`) rendered in gold — keep
  it restrained.
- **Editing content model:** after changing a collection/global, run
  `npm run generate:types` **and** `npm run migrate:create` — production Postgres
  never auto-pushes schema (Payload pushes only when `NODE_ENV !== 'production'`),
  so an uncommitted migration means a green build whose every page 500s on missing
  tables. `migrate:create` needs no database connection. Commit `src/migrations/`;
  `vercel.json` runs `payload migrate` ahead of `next build` on every deploy.
  If you regenerate `(payload)` boilerplate, use the file
  from the matching Payload version tag (e.g. `v3.88.0`), not `main`.

## Current state (things that are deliberate, not oversights)
- **Packages aren't published yet.** `/packages` has a `PACKAGES_READY = false` flag:
  the page shows "Coming soon" with a CTA to custom quote instead of displaying
  packages. Flip the flag once packages are entered in the admin. The working listing
  logic below is kept intact for when they're ready.
- **`/admin/create-first-user` is broken** on Payload 3.88 + Next 16.3.3 — it renders
  a blank page (the view is in the RSC stream but never reaches the DOM; reproduced
  locally against an empty DB under both Turbopack and webpack). Use
  `npm run create:admin` (`src/scripts/createAdmin.ts`, reads `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` from the environment) and sign in at `/admin/login`. The rest of
  the admin renders fine — it is client-rendered, so a `curl` of any admin URL looks
  empty even when the page works; check it in a browser, not with `curl`.
- **Sign-ups** (`/signup`) capture name, phone, birthday and "planning an event?". Saying
  yes branches into a second step for event details; saying no submits immediately. Each
  record is stamped `offer: SIGNUP100` for the ₹100-off promise —
  **nothing applies the discount automatically**; the team honours it when quoting.
  The header's Sign Up CTA is **switched off** (`SIGNUP_ENABLED = false` in
  `Header.tsx`, since the initial commit), so the offer isn't advertised anywhere yet.
  A phone-hero "₹100 off" ribbon was proposed and parked until the owner confirms the
  offer is live.
- **Gift registry (`/registry`, `/r/[slug]`, `/dashboard/[slug]`) — Phase 1 of 3.**
  Families create a registry (`CreateRegistryForm`), add gifts (pasted store links are
  scraped by `lib/scrapeMetadata.ts` — best effort, Amazon often blocks it, the host edits
  the preview), custom "any shop" gifts and shagun funds, keep a guest list with WhatsApp
  invites, and share `/r/<slug>`. All logic is in Server Actions
  (`app/(frontend)/registry/actions.ts`) over the Local API; the six `registry-*`
  collections are **admin-only over REST** (except `registry-leads`, public create, used by
  the guest page's `PlanBanner`). Things that are easy to get wrong:
  - **No host accounts.** Each registry has a manage key; only its scrypt hash is stored
    (`manageKeyHash`). Every host action re-checks it (`findEventForHost`). The dashboard
    sets `referrer: 'no-referrer'` because the key is in its URL.
  - **Privacy shield:** `lib/registry.ts` is the boundary. Guests get `PublicItem`s with no
    claimer fields; hosts see who claimed what only after turning on `revealClaims`.
    Don't pass raw Payload docs to registry client components.
  - **Claims are duplicate-proof by a unique index** on `registry-claims.item` (one row per
    gift), not by an `isClaimed` flag — a read-then-write flag races. Verified: 10
    concurrent claims → 1 row. Guests can undo from the same browser for 30 min (token
    in localStorage).
  - **Affiliate tags are added at redirect time** (`/r/[slug]/go/[itemId]`, `lib/affiliate.ts`,
    env `AMAZON_ASSOCIATE_TAG` / `AFFILIATE_REDIRECT_TEMPLATE`), so adding IDs later covers
    old registries. Each redirect logs a `registry-clicks` row.
  - **Shagun is host-UPI only** (QR + `upi://pay`). Taking money through Zenfest needs
    Razorpay **Route** (marketplace/KYC per host) — Phase 3, behind a flag, after Razorpay
    approves. Phase 2 is the return-gifts store (Razorpay checkout for Zenfest's own
    goods); the dashboard's "Return gifts" tab is a "coming soon" placeholder until then.
  - Registry styles live in `registry.css` (imported in the layout after `parts.css`),
    so `parts.css`'s last `@media` block stays the phone-hero one. `MobileCTABar` hides
    itself on `/r/*` and `/dashboard/*` (the guest page has its own sticky banner).
  - Local SQLite dev push creates new tables but does **not** add the new
    `registry_*_id` columns to the existing `payload_locked_documents_rels` table, so
    updates fail with a "Failed query … payload_locked_documents" error. Add them with
    `ALTER TABLE … ADD COLUMN` (as was done for `host_applications_id`). Production is
    fine: the migration adds them.
- **Polls (`/polls`, `/polls/closed`, `/polls/[slug]`, homepage band, registry "Polls" tabs).**
  Replaces the old Firebase app at polls.zenfestevents.in (redirected by host in
  `next.config.ts`). Collections `polls`, `poll-votes`, `poll-voters` (admin-only REST);
  pages read through `lib/polls.ts`, votes go through Server Actions in
  `app/(frontend)/polls/actions.ts`. Easy to get wrong:
  - **One vote per (poll, voterKey)** is a compound unique index on `poll-votes`
    (`p:<voterId>` public, `d:<deviceId>` family event polls). Verified: 10 concurrent
    votes → 1 row. Don't add a read-then-write check instead.
  - **Voter session** = signed httpOnly cookie `zf_voter` (`lib/voterVerification.ts`),
    `<id>.<v|u>.<hmac>`. The v/u flag is whether *this browser* proved the number, so
    typing someone's verified phone never yields verified votes. The proof is the
    WhatsApp reverse check (`consumePhoneProof` in `lib/phoneVerification.ts`, shared with
    the vendor hook); the provider is meant to be swapped there later (owner undecided).
  - `pollState()` closes a poll once `closesAt` passes — no cron. Event polls are polls
    with `registryEvent` set; public queries filter `registryEvent: { exists: false }`.
  - Results are withheld per `resultsVisibility` / `electionSensitive` (`canSeeResults`).
    Family event polls send results to guests unless "after close" (votes live in the
    guest's localStorage, so the server can't tell who voted).
  - **No generated OG images** (`opengraph-image.tsx` / `next/og`): Next's ImageResponse
    loads its own sharp (0.35.x) next to Payload's pinned sharp 0.34.2 and the native
    module clash **crashed the dev server**. Polls use the poll image or the logo instead.
  - Marketing consent is opt-in (unticked) and only ever switched on by the voter.
  - Styles in `polls.css` (imported after `registry.css`).
- **Zenfest AI (`lib/ai/*`, `components/ai/*`, `/plan`) — multi-agent event planner on
  open-source models.** The owner chose a coordinator + one specialist agent per service,
  and open models to avoid per-use API costs. Everything goes through the **OpenAI-compatible**
  API (`openai` SDK, `lib/ai/client.ts`), **Groq by default**: coordinator
  `qwen/qwen3.8-27b`, all specialists `openai/gpt-oss-120b` — env `AI_BASE_URL`,
  `AI_API_KEY`, `AI_COORDINATOR_MODEL`, `AI_COORDINATOR_FALLBACK_MODEL`,
  `AI_SPECIALIST_MODEL` (+ optional `AI_SPECIALIST_BASE_URL/_API_KEY`). Chosen by testing
  real chats: GPT-OSS-120B as coordinator kept asking questions instead of routing and
  slipped Korean into Tamil; GPT-OSS-20B as specialist mixed up options and ignored
  budgets. Qwen is a Groq **preview** model, so a 429/404/400 on the coordinator's first
  request retries that request on the fallback model (GPT-OSS-120B). `orchestrator.ts` runs **Zenfest** (streamed tool loop);
  its `consult_specialists` tool runs `specialist.ts` — a separate call that sees **only
  that service's `ai` group** from Services and answers in strict JSON. Easy to get wrong:
  - **Intake first** (`components/ai/IntakeForm.tsx`, `lib/ai/intake.ts`): a new chat shows a
    4-step form instead of a message box — event type + who's planning (+ relation); a
    **required month** per wedding function / event with an optional exact date inside it;
    where; guests; **at least one service or "Complete event planning"** (= every
    specialist) + name/phone/consent; then a **Confirm** step naming the specialists and
    offering to add more. Every field above is mandatory by the owner's call:
    `checkIntakeStep()` is the one rule set, used per step by the form and for all steps by
    `parseIntake()` on the server. `startChat()` (plan/actions.ts)
    validates it (`parseIntake`), creates the conversation with the answers as its `brief`
    and an `intake` transcript card, and **saves the Lead immediately**. The client then
    POSTs `/plan/chat` with `kickoff: true`; `runKickoff()` consults the chosen specialists
    **from code** (Qwen sent `"null"` placeholders when asked to do this first call itself)
    and has Zenfest write the summary + next question. Name/phone are prefilled as
    "Is this you? … Change" after "New chat" — the same slot a future customer-account
    profile should fill (owner plans sign-in later; then phone needn't be asked).
  - **Zenfest must not re-ask the form.** Every coordinator request gets a
    `CONFIRMED EVENT FACTS` block (`factsBlock()`), rebuilt from `state.brief` each time and
    never stored in history. New details go through `save_event_details` into
    `brief.extra` (facts block + lead plan); its `replan` list re-consults those
    specialists **in the same tool call** — Qwen otherwise saved the detail and only *said*
    the team would update. `consult_specialists` needs only `requests`; event fields are
    filled from the brief, and intake values are never overwritten by the model's.
  - **Previous chats:** the browser keeps its last 10 chats (`localStorage
    zenfest-ai-chats`: id, token, title); "New chat" only clears the active pointer.
    `switchTo()` reloads one through `loadChat()`; chats the server no longer has are dropped.
  - **One `consult_specialists` call carries every service** (`requests[]`), and the server
    runs those specialists in parallel. GPT-OSS on Groq can't make parallel tool calls, so
    one-tool-per-specialist would mean a full round-trip (and free-tier tokens) per service.
  - **The AI never writes a price.** Specialists pick option names + quantities;
    `priceCard()` prices them from the admin's ranges, drops unknown names/duplicates and
    raises quantities to `minQty`. A service with no options answers "team will advise"
    without calling the model. Keep it that way — invented prices are the main risk.
  - Specialist JSON uses `response_format` strict `json_schema` (from the zod schema) **and**
    is re-validated with zod, with one retry — small open models sometimes return bad JSON.
    Groq doesn't allow structured outputs together with tools/streaming, which is why only
    the (tool-less, non-streamed) specialist uses it.
  - `effortParam()`: `reasoning_effort` only for GPT-OSS; Qwen on Groq gets
    `reasoning_format: 'hidden'` instead, or its `<think>` text lands in the reply.
  - Specialists pick options by **exact name** (a zod enum of the service's option names,
    so strict mode can only return real options). Opaque Payload ids got swapped: the
    model meant one option and wrote another's id, pricing the wrong item.
  - **Specialist cards go to the customer unedited** (the UI renders the JSON); Zenfest only
    adds a short line. History (`state.messages`) is append-only; context notes go into the
    new user message.
  - **Free tier:** ~1,000 requests / ~200K tokens a day per model (about 5–10 full chats). A
    provider 429 (`isRateLimit`) or any API error becomes a "busy, leave your number" notice
    + contact card, so the lead is still captured. `ZENFEST_AI_DAILY_USD_CAP` (default 5)
    only matters on a paid plan; prices per model are in `config.ts`.
  - **Off unless `AI_API_KEY` is set** (or `AI_BASE_URL` is a key-less localhost server
    such as Ollama) and Site Settings → Zenfest AI is ticked (`aiAvailable()`); then every
    `AiLink` falls back to `/contact`, the band, bubble and header button disappear, and
    `/plan/chat` returns 503. The route lives under `/plan`, not `/api`, to stay clear of
    Payload's catch-all.
  - Placement (phone/desktop parity): homepage band under the hero (`MeetZenfestAI`),
    desktop bubble + side panel (`ChatLauncher`, ≥900px), phone = bottom bar's gold
    button → full-screen (no bubble on phones), header button (≥1440px only — it doesn't
    fit beside the nine nav links below that; `ai.css` widens the tight-nav rule to 1599px),
    phone-menu link, hero + outro first button, footer link, `/plan`.
  - Chats are stored in `ai-conversations` (admin-only): `transcript` is what the customer
    saw; `messages` is the raw OpenAI-format history. The chat token is scrypt-hashed like
    the registry key.
  - The lead link is **one-way** (`ai-conversations.lead`; Leads shows it through a
    virtual `join` field). A two-way relationship made the local SQLite dev push fail
    on every start. If a push still fails with "index … already exists", restart a few
    times — each run rebuilds one table and it settles.
  - This PC (GTX 1650 Super 4 GB, 24 GB RAM) is too small to run these models itself;
    local dev uses the same Groq key. First built on Claude, switched to open models
    2026-10-02 before any real traffic.
  - Styles in `ai.css` (imported after `polls.css`). `npm run seed:ai` adds sample
    options/prices locally — never on production.
  - **Go-live status (2026-10-02):** pushed to `master` but dormant until the owner adds
    `AI_API_KEY` in Vercel and, in the live admin, ticks "AI specialist enabled" on each
    service with real option price ranges (prod has none; with no specialists the intake
    offers only "Complete event planning" and Zenfest just asks which services).
- **Vendor marketplace + vendor/couple accounts (`/marketplace`, `/vendors/*`, `/account/*`).**
  Built after researching WedMeGood / WeddingBazaar (ex-ShaadiSaga) / WeddingWire India
  reviews: couples hate "price on request" and biased reviews; vendors hate ₹50k
  non-refundable packages and fake leads. So listings are **free**, show an all-in
  **price card**, are **reviewed by the team before going live**, and every enquiry comes
  from a **logged-in couple** with date/guests/area/budget. No payments yet (commission
  later via Razorpay Route). Easy to get wrong:
  - **Access: `req.user` is set for admins, vendors AND couples.** `authenticated` in
    `access/index.ts` is now an alias of `isAdmin` (`collection === 'users'`) — it used to
    be `Boolean(req.user)`, which would have let any vendor read every lead. Never check
    "is someone logged in"; check the collection. Same for field access (`isAdminField`).
  - **One login per browser.** All auth collections share Payload's `payload-token`
    cookie; logging in as a vendor logs an admin out of `/admin` in that browser.
  - **Vendors/customers are never written over REST** (create/update are admin-only).
    Sign-up and every dashboard edit are Server Actions (`lib/authActions.ts`,
    `vendors/actions.ts`, `account/actions.ts`) that take the account from the session,
    whitelist fields and re-check ownership. Exceptions: Payload's own login/me/forgot
    endpoints, and **photo uploads** — vendors POST multipart to `/api/vendor-media`
    (cookie auth; a hook stamps `vendor` from the session) to dodge Next's 1 MB Server
    Action body limit.
  - **Privacy boundary is `lib/marketplace.ts`** (like `lib/registry.ts`): the public only
    gets `PublicVendor`s of `listingStatus: 'published'` — no email/phone. A couple sees
    the vendor's phone only after the vendor replies (`vendorContact`); the vendor sees
    the couple's phone with the enquiry (it's their lead).
  - `listingStatus` (draft → pending → published/paused/rejected) and `reviewNote` are
    admin-only fields. The vendor's "Send for review" (`submitForReview`) requires
    `lib/listing.ts` gaps to be empty and emails the team; **publishing = setting
    "Listing status" to Live in /admin**. Vendors can then pause/resume themselves.
  - **Photo & cake vendors also answer the original questionnaire** (Questions tab =
    `VendorForm` with an `account` prefill) → a `vendor-applications` row, so the FSSAI
    rules, team email and **Airtable sync keep working**. `requireVerifiedPhone` strips any
    client-sent `vendor`, and for a logged-in vendor stamps `vendor` + trusts the
    account's phone; `linkVendorApplication` links it back and seeds an empty price card.
  - Payload rejects a cookie session unless the request carries a browser
    `Origin` in `csrf` or `Sec-Fetch-Site: same-origin|same-site|none`. So **curl needs
    `-H 'Sec-Fetch-Site: same-origin'`** (or `Authorization: JWT <token>`), and on a phone
    over Wi-Fi (`http://<LAN IP>:3000`) Server Actions see you as logged out — the LAN
    origin isn't in `csrf` (dev only).
  - Without SMTP, Payload logs only an email's subject; `collections/accountAuth.ts`
    prints the **password-reset link** to the dev console so resets can be tested.
    Production needs SMTP for resets.
  - Booking an enquiry ("Mark booked") also blocks that date; date search hides vendors
    who blocked it. `areas` is a text `hasMany` (validated against `MARKET_AREAS`) to avoid
    enum migrations; categories/units/statuses *are* enums → `migrate:create` on change.
  - `/signup` is still the ₹100-offer form — account pages live at `/account/signup` and
    `/vendors/signup`.
- **"Earn from events" (`/earn`) is hosts-only.** Modelled on joinmywedding.com: families
  in Tamil Nadu apply (`HostForm` → `/api/host-applications`) to let foreign travellers
  attend their wedding or function for a fee. Guest browsing, booking and payment are
  **deliberately not built** — the team verifies families and arranges guests and payouts
  offline (`payoutNotes` in the admin). Earnings shown are constants (`EARNINGS`) in
  `earn/page.tsx`. Option lists (incl. `HOST_CITIES`, Tamil Nadu only for now) live in
  `lib/hostOptions.ts`; they are Postgres enums, so adding a city needs `migrate:create`.
  Reached from the homepage band ("Earn from events" button), the header nav and footer.
- **Contact details are real** (phone/WhatsApp `9080089530`, both link to maps/calls) and
  live in three places that must stay in sync: the **SiteSettings** global (what's served),
  `src/seed/index.ts` (demo seed), and `SITE_FALLBACK` in `src/lib/site.ts` (client
  fallback). Update all three to keep the site coherent.
- **Forms and page structures** are flexible: all pages can be edited via the admin
  (Services, About, Contact copy, etc.) or the CMS, but HTML/component structure changes
  require code edits.
- The repo **is** a git repository (`master`, remote `zenfestevents/zenfestevents-webapp`)
  and deploys to Vercel from `master`. Still prefer a flag or a comment over deleting
  working code. Note the video masters (`hero_master.mp4`, `scrub.mp4`, `0902.mp4`)
  were committed despite the note above — ~150 MB of the repo is dead weight.

## Deploy
Vercel (app) + Neon (Postgres) + Vercel Blob (media). Env vars and steps are in
[README.md](README.md). **Live at https://zenfestevents.in** (served from
`www.zenfestevents.in`); pushing `master` deploys. The old
`zenfestevents-webapp.vercel.app` domain was removed and now 404s — so
`NEXT_PUBLIC_SERVER_URL` in Vercel must be `https://www.zenfestevents.in` (no trailing
slash; it feeds Payload's `serverURL`/`cors`/`csrf` and `metadataBase`). The site's own
forms POST to relative `/api/...` paths and don't depend on it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
