# CLAUDE.md

Guidance for working in this repository.

## Project
Zenfest Events — an **event management company in Tamil Nadu**, aiming at every major
city in the state (owner, 2026-10-14). Copy never positions it as a Chennai company: say
"Tamil Nadu" / "major cities across Tamil Nadu"; Chennai appears only as one city among
`MAJOR_CITIES` (`lib/site.ts`, footer) and in the real branch addresses. It is growing
from a marketing site into a
wedding/event **web app** (an ecosystem: fund → plan → book → guests → run the day → after).
Public site + a self-service admin/back-end in one codebase. Business model has two lanes:
**DIY couples book vendors themselves on the marketplace**; couples who want a planner hand
off to the Zenfest team (Leads). There are **three kinds of login**, all Payload auth:
admin/staff (`users`, `/admin`), **vendors** (`vendors`, `/vendors/*`) and **couples**
(`customers`, `/account/*`) — see "Vendor marketplace" below. Still no payments. The gift
registry (secret host link) and **Zenfest AI** (chat token in the browser) predate accounts
and don't use them yet; Zenfest AI's intake has the slot for profile name/phone. See
[README.md](README.md) for setup and [DESIGN.md](DESIGN.md) for the visual direction.
**Ideas for later go in [IDEAS.md](IDEAS.md)** — when the owner shares an idea in chat,
add it to the right section there (owner + date) instead of building it.

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
npm run seed:shop        # 15 demo shop products (affiliate + seller), local SQLite only; run seed:marketplace first
npm run seed:decor       # 10 demo decorations + 3 suppliers with placeholder photos, local SQLite only
npm run test:decor       # Decoration catalog: codes, price history, privacy/roles (local SQLite only)
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
    (home)/page.tsx       Homepage: hero + vendors + featured work + services + testimonials
    testimonials/page.tsx Client reviews (most copied from Google) + Google rating/link
    about/page.tsx        About page
    gallery/page.tsx      Gallery (Our Work) — all projects
    services/page.tsx     Services listing
    packages/page.tsx     Bundled packages (PACKAGES_READY flag)
    contact/page.tsx      Contact form (inquiry)
    enquire/page.tsx      "Plan your event" — wedding / birthday / baby shower requirements
                          form (EventRequirementsForm; ?event= preselects); main client CTA
    signup/page.tsx       Signup / offer form (branches on "planning an event?")
    vendors/              /vendors chooser (two lanes), partner/ (VendorForm application),
                          marketplace/ (listing landing), signup, login,
                          forgot/reset-password, dashboard, actions.ts
    account/              Couple account: /account (enquiries, shortlist, planner
                          hand-off, profile), signup, login, forgot/reset-password,
                          session/route.ts (header button), actions.ts
    marketplace/          /marketplace, /marketplace/[category] (+ 'all'),
                          /marketplace/v/[slug] (vendor listing + quote form)
    shop/                 Zenfest Shop: /shop, /shop/[occasion] (+ 'all'), /shop/p/[slug],
                          /shop/go/[id] (affiliate redirect), /shop/policies
    earn/page.tsx         "Earn from events" — families apply to host foreign guests
                          marketplace/cities/ + marketplace/area/[slug] = city pages and
                          /marketplace/<service>-in-<place> (lib/locations.ts, areaPages.ts)
    plan/                 Zenfest AI: full-screen chat page, chat/route.ts (NDJSON
                          stream; kickoff after the intake), actions.ts (startChat =
                          intake → conversation + Lead, contact card, loadChat)
    layout.tsx            Root layout, Header, Footer, MobileCTABar
    styles.css            Design tokens (colors, typography, spacing)
    parts.css             Component & section styles
    registry.css, polls.css, ai.css, marketplace.css, shop.css   Feature styles (imported in that order)
    game.css              The cricket "night match" layer (imported last)
  app/(payload)/        Payload admin (generated boilerplate — avoid hand-editing)
  collections/          Users, Media, Categories, Services (+ `ai` specialist group),
                        Packages, Projects, Leads, Signups, VendorApplications,
                        HostApplications, registry-*, polls / poll-votes / poll-voters,
                        AiConversations (Zenfest AI chats), Vendors + Customers (auth),
                        VendorMedia, Enquiries (marketplace), Testimonials,
                        Decor* (decoration catalog: items, photos, suppliers,
                        price history, price views)
  globals/              SiteSettings, DecorSettings, …
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
    contentCache.ts      Cache for content every visit reads (settings, homepage, reviews)
    testimonials.ts      Server-only: published reviews as PublicTestimonial (short names)
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
- **Forms** (`InquiryForm`, `EventRequirementsForm`, `VendorForm`, `SignupForm`) POST to Payload's REST API
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
- **WhatsApp inbox & campaigns (`/admin` → WhatsApp; `collections/WhatsApp*.ts`,
  `lib/whatsapp/*`, `components/admin/whatsapp/*`), 2026-10-14.** The owner chose the
  Cloud API **directly with Meta, no BSP** (only Meta's per-message fees), on a second,
  API-only number **+91 73975 55188** (`WHATSAPP_BUSINESS_NUMBER=917397555188`, phone
  number ID `1424189764102540`, WABA `4489772861336046`). The main line 9080089530 stays
  on the WhatsApp Business app (Coexistence needs a BSP) and is still the site's
  "WhatsApp us" number. Easy to get wrong:
  - **Meta allows one webhook per app**, so `/api/phone-verifications/webhook` is it:
    `webhookReceive` checks the signature, calls `recordWebhook()` (saves every message +
    delivery status, creates the WhatsApp Contact on first message, links a Lead by phone,
    handles STOP/START) and then does the verification codes. Don't add a second webhook.
  - **Vaasal (renamed 64 Sqft, 2026-10-26) shares this number** for its WhatsApp login until it
    has its own. With `VAASAL_WEBHOOK_URL` set, `webhookReceive` passes messages like "64 Sqft
    login code: 123456" (Tamil wording too, and the old "Vaasal …" / "வாசல் …" texts) to it with the raw body and Meta's original signature (same Meta
    app, so the same App secret checks out there) and leaves them out of the inbox
    (`lib/whatsapp/vaasal.ts`). Unset, nothing changes. Remove once Vaasal has its own number.
  - `whatsapp-contacts` (inbox + campaign audience) is separate from the occasion-reminders
    `contacts` (staff-entered birthdays/anniversaries); both store phones as `91XXXXXXXXXX`
    (`toWaNumber`). Linking or merging them is a possible later step.
    Campaigns go only to `optIn = 'yes'`; imported rows are `unknown` unless staff tick
    the consent box. Never auto-opt-in someone because they messaged us.
  - Campaign sends run in **browser-driven batches of 20** (`/:id/send-batch`), so no
    request hits Vercel's time limit; a person gets a campaign at most once, **failures
    included** (no retry loops). Errors that mean the campaign itself is wrong (template,
    token, payment, rate limits — `CAMPAIGN_ERRORS`) stop the batch without marking anyone.
  - Free-form replies only within 24 h of the person's last message (`lastInboundAt`);
    outside it the reply endpoint refuses and staff must use a template.
  - Status ticks only move forward (`STATUS_RANK`): Meta can send "delivered" after "read".
  - AI auto-replies on WhatsApp are a later phase (owner to choose Zenfest AI vs Claude).
  - Tests: `npm run test:whatsapp` (local SQLite only, fake Meta API — accounts, inbox,
    import, campaigns, replies); `npm run check:whatsapp [url]` is a read-only health check
    of the live setup (handshake, number, subscription, templates; needs the WHATSAPP_* env).
- **Vendor and couple accounts are WhatsApp-number only (owner, 2026-10-14).** Switches in
  `lib/accountOptions.ts`: `EMAIL_LOGIN = false` (email + password sign-up/login, forgot/
  reset, confirm-email — code kept, pages redirect to login, actions refuse) and
  `GOOGLE_SIGNIN = false` (gates `googleEnabled()`; the Google env vars stay set in Vercel).
  Sign-up = name + WhatsApp number (+ business name first with "Same as business name",
  and category, for vendors) + the PhoneVerify proof; login = PhoneVerify proof only
  (`signUpWithWhatsApp` / `logInWithWhatsApp` in `lib/authActions.ts`, logic in
  `lib/whatsappAuth.ts`, session via `startSession`). Easy to get wrong:
  - **New sign-ups are closed while `FEATURES.marketplace` is off** (owner, 2026-10-14):
    `signUp`, `completeGoogleSignUp` and `signUpWithWhatsApp` refuse and the sign-up pages show
    "Coming soon"; WhatsApp **login** and dashboards keep working for existing accounts.
  - **No fallback by the owner's choice:** with `verifyMode() === 'off'` sign-up/login show
    "WhatsApp verification is not available", so the WHATSAPP_* env must stay set.
  - A login only opens an account whose number is `phoneVerified` (`verifiedAccountsWithPhone`);
    one verified account per number per kind. The number changes only through `changeMyPhone`
    (dashboards' `ChangePhone`, verify first); `updateProfile` / `saveListing` keep the old one.
  - Payload auth still needs an email, so these accounts get `<phone>@whatsapp.invalid`
    (`placeholderEmail`); `sendMail` skips it and dashboards hide emails while `EMAIL_LOGIN` is off.
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
- **Admin look:** `/admin` is re-skinned in `app/(payload)/custom.scss` (unlayered, so it beats
  Payload's `@layer payload-default`): Payload's grey scale `--color-base-*` is replaced by the
  warm ivory→ink ramp and `--color-success-*` by gold, so every Payload screen follows the brand
  in light and dark mode. The side menu and login/logout pages are ink (`zf-dark-surface` mixin
  reuses Payload's dark mapping). Fonts: Hanken Grotesk body, Oswald headings (Google Fonts
  import there). Logo/icon: `components/admin/BrandGraphics.tsx` (plain `<img>` — `next/image`
  only allows `/api/media/file/**`). Custom admin components use `zf-*` classes from that file,
  not inline styles. The menu groups are plain words in daily-work order (Clients · Vendors ·
  WhatsApp · Birthdays & anniversaries · Website · Rewards · Team · System): Payload orders groups
  by first appearance, so the `collections` array in `payload.config.ts` sets it. Home screen =
  `TodayBoard` (jobs waiting, per role) then `UpcomingOccasions`; status selects use the
  `StatusPill` list cell. Every list has a one-line plain-English `admin.description` — keep it.
- **Admin team roles (`access/roles.ts`, owner 2026-10-25).** Each `users` login has a `role`:
  **Owner** (everything, Team, deleting) · **Manager** (approves vendor applications / listings /
  reviews, edits the website and settings, sends WhatsApp campaigns, imports contacts) · **Team
  member** (works enquiries, replies on WhatsApp, wishes; default for new people) · **Viewer**
  (looks only). Easy to get wrong:
  - **Never use `authenticated` / `isAdmin` on new collections**; pick `canView` / `canWork` /
    `canManage` / `ownerOnly` (and the `…Field` twins for approval fields). Delete is `ownerOnly`
    everywhere, which also removes Payload's Delete button for everyone else.
  - Every role check also requires `active !== false` ("Can log in"): untick it when someone leaves
    instead of deleting them (`beforeLogin` refuses, `access.admin` locks the panel). The last
    active Owner can't be demoted, switched off or deleted (`keepAnOwner` in `Users.ts`).
  - Only the Owner sees Team (`hiddenBelow('owner')`); others edit their own name/password from
    the account menu. Runs history, invite visits and phone checks are Owner-only too.
  - **Hidden for now: `ADMIN_HIDDEN`** in `access/roles.ts` (gift registry, polls, Zenfest AI,
    shop, host applications, ₹100 sign-ups, marketplace enquiries). `admin.hidden` removes them
    from the menu *and* their admin pages (404); the data, REST API and website keep working (the
    public registry is still live). Delete a slug from the set to bring a list back.
  - The `20261025_152046_team_roles` migration made every existing login an **Owner**; a local
    SQLite push gives existing rows the default `team` instead — set them with SQL.
    `npm run create:admin` makes an Owner. `npm run test:roles` (local SQLite) checks every role;
    `-- --keep` leaves `role-<role>@test.invalid` logins (password in the script) to try by hand.
- **Styling:** plain CSS design system. Tokens live in `styles.css`; component/section
  styles in `parts.css`. Use the existing CSS variables and class prefixes; avoid
  adding a CSS framework.
- **Night match: cricket theme, mostly dark (owner, 2026-10-24; see DESIGN.md).** Easy to
  get wrong:
  - **Use the semantic tokens** for anything that must work on both grounds:
    `--surface`/`-1..3`, `--text`, `--text-muted`, `--line`, `--link`, `--ok`, `--err`.
    `var(--ink)` as a text colour turns invisible on the dark page.
  - **Light pages:** `.surface-paper` flips the tokens back to ink on ivory. The registry,
    `r`, `dashboard`, `shop`, `polls` and `plan` routes get it from a one-line `layout.tsx`
    (`components/PaperSurface.tsx`), because `registry.css`, `polls.css`, `ai.css` and
    `shop.css` still use the raw ivory palette.
  - **`.band-ink` forces dark** even inside paper.
  - Game pieces live in `components/game` (server-safe):
    - `SeamDivider` replaced `KolamDivider` everywhere except paper features.
    - `BallDots`, `Scoreboard`, `Ticker`, `GoldRing`, `TierBadge`, `LaurelRating`.
    - Their styles are in `game.css`.
  - **The header is ticker + bar.** `--header-h` (101px) must stay a plain px value equal
    to `--ticker-h` + `--bar-h`: `EventRequirementsForm` reads it with `parseFloat`.
  - **Never put `backdrop-filter` or `transform` on `.site-header` itself.** Either one makes
    it the containing block for the fixed phone drawer, which then collapses into the bar.
    The laptop pill's blur sits on `.site-header__inner`.
  - Scoreboards show **real numbers only**.
  - **Cricket copy is generic: never IPL, a league, team, player or stadium name.** Also
    never "Whistle Podu" (a registered Class 41 trademark of the Chennai team), "Orange
    Cap", "Purple Cap" or "Strategic Timeout". The full list is in DESIGN.md.
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
  image with its speech bubble baked in (`public/hero/poster-mobile-{720,860,1080,1290}.webp`,
  from the untracked master `hero-mobile-source.png.png`), shown **whole, full width, just
  under the header** — cropping it to fill the screen cut people off and hid the bubble
  under the header. Heart/kolam-rosette/glow/outro/scrim are hidden. Under the image, a
  dark band holds (in order) the eyebrow, headline, lede and a `KolamDivider`
  (`.scrubhero__divider`, phones only); the desktop buttons and tags are hidden there —
  **phone actions live in `MobileCTABar`, never in the hero**. All of it is the last
  `@media (max-width: 720px)` block in `parts.css`. Regenerate the images with
  `node build-hero-mobile.cjs` (sharp, WebP quality 66; keep its `WIDTHS` and `AVIF_WIDTHS`
  in step with the two `srcSet`s). WebP, not JPEG: the busy petals/sparks made the JPEGs twice
  the size. **AVIF comes first (2026-10-25):** quality 40, 540–1080w, about half the WebP's
  bytes with no visible change; it stops at 1080w (a 3x phone took the 367 KB 1290w WebP).
  The image was the phone homepage's biggest download, which kept its PageSpeed LCP at 3.2 s.
  **Phones swipe (owner, 2026-10-22):** the image + band is slide 1 of a scroll-snap slider;
  the next slides are the vendor lanes (`VENDOR_SLIDES` in `ScrubHero.tsx`: Partner with
  Zenfest, plus Vendor Marketplace only once `FEATURES.marketplace` is on — so two slides and
  two dots for now; see "One way to join" under vendors), CSS posters sized
  to the image (150vw) with a text link each — the one exception to "no actions in the
  hero". Dots sit over the image's bottom edge; it auto-advances every 6 s until touched
  (never under reduced motion). On laptops `.scrubhero__track` / `__slide--main` are
  `display: contents` and the vendor slides are hidden, so the film is untouched — the
  owner chose to keep the film there. The homepage's "For vendors" section
  (`components/VendorPaths.tsx`) sits right under the hero.
  Things that are easy to get wrong here:
  - **The phone `<source>` carries `width`/`height` (860×1290)** and the poster has
    `fetchPriority="high"`. Phones size the hero by the image, so without the size the
    page jumped when it loaded — PageSpeed's layout shift was 0.68 (2026-10-14).
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
  the "ZENFEST EVENTS™" wordmark (it used to be hidden below 420px). **The menu is grouped
  (owner, 2026-10-22) so new pages join a group instead of widening the bar:**
  `buildNav()` in `Header.tsx` → **About Zenfest ▾** (Home, Our Work, About, Testimonials
  once a review is published, + Polls) · **Services ▾** (Services, Packages · Soon, + Shop,
  Earn) · **Contact**, then "Plan your event" (`/enquire`) + "For Vendors"
  (`VENDORS_HREF`). Laptop groups are `NavDropdown`s (open on hover or click; close on
  Escape, an outside click, tabbing out or a route change; the group lights up when a child
  page is open). `FEATURES` gating stays per item, so a feature switched on lands in its
  group. Three entries keep `.site-header--compact` (desktop bar from **1000px**); with the
  marketplace on, "Marketplace" is a fourth plain link. The phone menu shows the same groups
  as headings (+ **Coming soon**, only with `ANNOUNCE_COMING_SOON`) and **For vendors**
  (Partner with Zenfest; Marketplace listing once it's open). The footer mirrors it:
  About Zenfest / Services / Contact (with the branches).
- **Mobile bottom bar (`MobileCTABar`, <900px, every page except the registry's `/r/*`, `/dashboard/*`, `/plan` and `/enquire`):**
  WhatsApp (green) · **Plan your event** (gold "zari" sheen — `zari-sheen` keyframes;
  `/enquire`) · For vendors (`VENDORS_HREF`), by the owner's choice on 2026-10-14 (it was Earn
  from events · Ask Zenfest AI · Enroll as a vendor). No Call button. The desktop hero's
  buttons are "Plan your event" (the AI link, which falls back to `/enquire` while the AI
  is off) + "See our work". The sheen stops under `prefers-reduced-motion`.
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
- **Replacing a picture in `public/hero/` or `public/brand/`? Give the new file a new name**
  (e.g. `poster-mobile-860-v2.avif`) and update every place that uses it (`srcSet`s, the
  build scripts' output names). Browsers keep those folders for a week (`headers()` in
  `next.config.ts`, owner 2026-10-25), so a file swapped under the same name reaches
  returning visitors only after up to a week. Photos uploaded in `/admin` are not affected.
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
  **Public pages use small WebP copies** made by the same script — `emblem.webp` (header),
  `wordmark.webp` (from `wordmark.png`), `logo-footer.webp` (footer) — sized ~3x their CSS
  size; the PNGs stay for the admin, the AI chat and the polls' social-card fallback. The
  favicon is 192px (the old 512px one was 360 KB, downloaded on every page).
  **PageSpeed:** `PAGESPEED_API_KEY` in `.env.local` (local only) works with
  `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=…&strategy=mobile&key=…`;
  keyless calls get quota 0.
- **Signature motif:** kolam line-art (`components/Kolam.tsx`) rendered in gold — keep
  it restrained.
- **Editing content model:** after changing a collection/global, run
  `npm run generate:types` **and** `npm run migrate:create` — production Postgres
  never auto-pushes schema (Payload pushes only when `NODE_ENV !== 'production'`),
  so an uncommitted migration means a green build whose every page 500s on missing
  tables. `migrate:create` needs no database connection. Commit `src/migrations/`;
  `vercel.json` runs `payload migrate` ahead of `next build` on every deploy.
  **Never rename, regenerate or edit a migration once it is pushed to any branch** — add a
  new one instead. Vercel applies env vars to Preview builds unless they're limited to
  Production, so a branch push can migrate the live Neon database. A regenerated decor
  migration (2026-10-31) made the next preview build fail with "already exists".
  If you regenerate `(payload)` boilerplate, use the file
  from the matching Payload version tag (e.g. `v3.88.0`), not `main`.

## Current state (things that are deliberate, not oversights)
- **Feature switches (`lib/features.ts`, 2026-10-14).** The owner trimmed the site to what
  is live: `FEATURES = { ai, marketplace, earn, polls }`, all `false` then.
  **`marketplace` is `true` since 2026-10-24** (vendor + couple sign-up and login, dashboards,
  Runs club, Refer & earn). **Only the couples' side is "Coming soon" (`MARKETPLACE_SOON`,
  owner 2026-10-25: launch once each service has 15–20 vendors):** `/marketplace`, its
  categories and vendor pages show `<ComingSoon>`, the menu/footer link carries "Soon", the
  homepage band says "Coming soon" with "Plan your event" instead of "Browse", and the sitemap
  leaves them out. Never switch `FEATURES.marketplace` off to hide the marketplace — that also
  removes every vendor and couple login (it did, by mistake, on 2026-10-25). Off means the code
  stays and: AI / Marketplace / Earn pages render `<ComingSoon feature=…>` (`/plan`,
  `/marketplace/*`, `/earn`, `/vendors/marketplace`, and the vendor + couple sign-up /
  complete-signup pages — `signUp` / `completeGoogleSignUp` refuse server-side too); poll
  pages `notFound()` and the registry's family-poll tabs hide (`polls.zenfestevents.in` now
  lands on the 404); the homepage's AI / marketplace / Earn bands disappear (a "More ways to
  celebrate" band, the footer's "· soon" links and the phone menu's "Coming soon" group
  return only with `ANNOUNCE_COMING_SOON` — off since 2026-10-22: the owner doesn't want to
  show what's still being built); the header account button hides (logins, dashboards and
  resets still work by URL). `aiAvailable()` also requires `FEATURES.ai`, so every AI entry
  point falls back to `/enquire`. Flip a flag to `true` to bring a feature back exactly as
  it was (checked 2026-10-14). The gift registry stays live. **`FEATURES.shop` (2026-10-22,
  off):** the owner is concentrating on vendors, so the Shop is hidden — no nav/footer link,
  no "Pick gifts from the Zenfest Shop" on the registry dashboard, `/shop` and
  `/shop/[occasion]` `notFound()`. Product pages and `/shop/policies` stay up because
  registry gifts and the privacy page link to them.
- **"Plan your event" (`/enquire`) replaces the team's three Tally forms** (Wedding &
  Reception `w4pMpk`, Birthday `waaAMX`, Baby Shower `nPGJKx`), rebuilt natively so answers
  land in Leads (+ team email, + occasion reminders) instead of Tally. The option lists,
  copied from Tally (plus a name field, which Tally lacked), live in
  `lib/eventRequirements.ts`; values are short readable names stored as-is in the Leads
  `requirements` group (text `hasMany`, validated against the lists, so adding a service
  needs no migration). `eventType` gained `babyshower` (an enum → migration). Steps stay
  mounted (`hidden`) so one FormData holds every answer; `problem(step)` is the only rule
  set. Corporate events and housewarmings still go through `/contact`. **Logged in (couple or
  vendor, owner 2026-10-25), the last step asks nothing**: it shows "Sending as <name> ·
  ••••1234" with "Not you? Log out" (Payload's `/api/<collection>/logout`, then the fields
  appear; answers stay). `stampLeadAccounts` overwrites a couple's lead name/phone with the
  account's own; no email is sent (accounts only have the placeholder one).
- **Sign-up popup (`components/JoinPrompt.tsx`, root layout), owner 2026-10-25:** 8 s into a
  page, a visitor who isn't logged in gets a `<dialog>` to join (couple sign-up, log in, or
  "Are you a vendor?") listing the runs from Reward Settings (`/account/session` returns
  `join: { joined, enquiry }` when logged out). Once per browser session (`sessionStorage`
  `zenfest-join-prompt`), only while `FEATURES.marketplace` is on, never on `QUIET` pages
  (account/vendor pages, `/enquire`, `/plan`, `/welcome`, `/invite`, `/rewards`, `/refer`,
  registry `/r/*` and `/dashboard/*`) or over another open dialog. Styles at the end of `game.css`.
- **Packages aren't published yet.** `FEATURES.packages = false` (it was a local
  `PACKAGES_READY` until 2026-10-22): the page shows "Coming soon" with a CTA to custom quote
  instead of displaying packages, and its link in the Services menu, phone menu and footer
  carries a "Soon" tag. Flip the
  flag once packages are entered in the admin. The working listing
  logic below is kept intact for when they're ready.
- **Testimonials (`/testimonials`, `collections/Testimonials.ts`, `lib/testimonials.ts`),
  2026-10-22.** The owner asked for the Google Business reviews on the site. Google's Places
  API gives only 5 reviews (and forbids storing them) and the Business Profile API needs
  Google's approval, so the reviews were **read from the listing once and copied word for
  word** into `src/seed/googleReviews.ts` (117 reviews, 97 with text; main listing,
  Guduvancheri, place ID `ChIJZYW4DML3UjoR3k67YiIkueA`). `importGoogleReviews()` loads them:
  locally `npm run import:reviews`, in production the data migration
  `20261022_172311_google_reviews` (runs on deploy, skips ones already there). New reviews
  are added by staff in `/admin` → Testimonials. Easy to get wrong:
  - **Never change a review's words or stars.** 4–5★ are published; the 1★ and 2★ reviews
    with text were imported **unpublished** for the owner to decide. The page also shows the
    overall Google rating, count and "Read all reviews on Google" (Site Settings → Google
    reviews, fallback in `SITE_FALLBACK.reviews`) — update the numbers there now and then.
  - Names show as first name + initial (`shortName`); the admin keeps them as on Google.
    `date` is approximate (Google only says "2 months ago"); it's for sorting, not shown.
    `eventType` was guessed only when a review names exactly one kind of event.
  - The public reads only `published` rows (collection access). Testimonials appears in the
    menu, footer and homepage ("Loved by families", featured first, then newest 5★) only
    while at least one is published; `/testimonials` 404s otherwise.
- **Homepage speed (2026-10-22).** The live homepage took 1.3–2.6 s to start (other pages
  ~0.6 s): it hit Neon several times per visit, partly for switched-off features. Now:
  - `lib/contentCache.ts` caches site settings (every page), the homepage's projects +
    services and testimonials (`unstable_cache`, 5 min safety expiry). **Saving in /admin
    clears it at once**: `hooks/revalidateContent.ts` on Projects, Services, Testimonials
    and Site Settings (`revalidateTag(…, { expire: 0 })`). Scripts and migrations can't clear
    it (no Next request), so their changes show within 5 minutes. Never put anything that
    reads cookies inside `cachedContent`.
  - The AI band's query runs only with `FEATURES.ai`; the "any recent project" fallback runs
    alongside the featured query instead of after it.
  - `(home)/loading.tsx` (a kolam screen while Home rendered) was **removed on 2026-10-25**
    when the homepage became a cached page: clicking Home is now instant, and on a cached
    page the loading screen still painted first and React swapped the real page in after
    it (a flash, and a stuck screen in background tabs). Don't add loading screens to cached
    pages. Never add a group-wide one either: a loading screen makes a page stream, and a
    streamed `notFound()` / `redirect()` answers 200 instead of 404 / 307.
- **Page caching (2026-10-25).** Functions ran in `iad1` (Washington) while visitors are in
  India: every per-visit page paid a ~250 ms round trip to the US, plus a 1.5–2 s Payload
  cold start whenever the function had gone idle (PageSpeed measured 1.8 s TTFB on the
  homepage). So the pages that look the same for everyone are **cached pages** (ISR):
  `export const revalidate = 300` instead of `force-dynamic` — Home, About, Contact, Our
  Work, Services, Testimonials, Packages, Privacy, `/signup`, `/registry`,
  `/registry/create`, `/shop/policies`. Vercel serves them from its Mumbai edge and rebuilds
  them in the background at most every 5 minutes; saving in /admin clears them at once,
  because their reads go through `cachedContent` and the page inherits its tags (that is why
  Our Work and Services now read through it too). Easy to get wrong:
  - **A cached page must not read the login, cookies, headers or `searchParams`.** Doing so
    silently turns it back into a per-visit page (the build's route list shows `ƒ` instead
    of `○`). The homepage's vendor hearts therefore fill in from the browser:
    `/account/session` returns the couple's `shortlist`, and `VendorCard` without
    `shortlisted` lets `ShortlistButton` read it. Pages that must stay per-visit: anything
    with `verifyMode()` (PhoneVerify), sessions, `searchParams` (`/enquire`'s `?event=`) and
    the marketplace (shortlist hearts from the server).
  - Data a cached page reads without `cachedContent` (e.g. live vendors on the homepage)
    shows up within 5 minutes, not at once.
  - **Functions run in Singapore (`sin1`, `vercel.json` `regions`) since 2026-10-25**, beside
    the Neon project ("Zenfest Events Web App", AWS ap-southeast-1 — fixed at creation; a
    move means a new project + data copy). Before that they ran in `iad1`, so every query
    crossed the Pacific: one settings read added ~0.2 s, the marketplace took 0.77 s warm.
    Keep the function region beside Neon's; never `bom1` alone.
  - `components/NavProgress.tsx` (root layout) draws a gold line from a link click until the
    next route renders, because per-visit pages show nothing until the server answers. No
    `loading.tsx` instead (see the homepage-speed note above).
- **SEO (2026-10-25).** `app/sitemap.ts` (public live pages only, `FEATURES`-aware; live
  vendors and categories with vendors) and `app/robots.ts` sit at the root of `app/`, next to
  both route groups. Every indexable page sets `alternates.canonical` (relative; resolved
  against `metadataBase`). The root layout's `openGraph` carries only site name, locale and
  the share image `public/og.jpg` (1200×630, from the hero poster), **no title/description**:
  metadata merges shallowly, so a fixed og:title made every shared link read like the
  homepage; left out, Next fills og/twitter title + description from each page's own. The homepage renders LocalBusiness JSON-LD from Site Settings (`lib/seo.ts`) —
  never add review stars to it (Google ignores self-served ratings).
- **City & area pages ("front door / side door" SEO, owner 2026-10-29).** `lib/locations.ts`
  holds the 25 city corporations and ~150 popular areas with map points (OpenStreetMap;
  `// ~` = estimated). Zones: **direct** (Chennai, Tambaram, Avadi, Kanchipuram — Zenfest's
  own team) and **market** (partner vendors). **All of it lives under the marketplace (owner,
  2026-10-30):** `/marketplace/cities`, `/marketplace/cities/<city>` (services + a "Popular
  areas" grid of plain links) and `/marketplace/<service>-in-<city or area>` (services in
  `lib/areaPages.ts`), all cached pages built on first visit (`generateStaticParams` returns
  `[]`). These stay live while `MARKETPLACE_SOON` hides the vendor browsing. The header's
  **Marketplace** dropdown (and the phone menu's Marketplace group) lists only the 25 cities,
  then "All cities" and "All vendors · Soon". Direct-zone pages pin `ZenfestHostCard` ("Verified
  Premium Host", real Google numbers only) above vendors. Vendors match by `baseArea` +
  `travelKm` (dashboard "Where you're based") or their Chennai `areas` (`reachKm` in
  `lib/areaVendors.ts`). Easy to get wrong:
  - **Built for every place, on Google only when real (owner's choice):** `indexable()` —
    direct-zone in-house services at once; everything else `noindex` until `MIN_VENDORS` (3)
    live vendors serve it, and vendors count only once `MARKETPLACE_SOON` is off. The sitemap
    lists only indexable ones. Hundreds of empty look-alike pages read as doorway pages to
    Google and can sink the whole site — never index them all.
  - Slugs are URLs, unique across cities **and** areas (same-name areas and generic roads carry
    their city: `anna-nagar-madurai`, `trichy-road-namakkal`). Never rename a live one.
    Zenfest-only services (event/wedding planners) 404 in the market zone.
  - Area pages live in `marketplace/area/[slug]` and are reached through a **rewrite** in
    `next.config.ts` (`/marketplace/:slug(.+-in-.+)`), because `/marketplace/[category]` reads
    search filters and can't be cached. `/marketplace/area/…` redirects to the public address.
    Category slugs must never contain `-in-`.
- **Live `/admin` was blank (fixed 2026-10-25):** the Vercel Blob plugin adds an admin
  provider (`VercelBlobClientUploadHandler`), and Payload renders nothing under a provider
  missing from `importMap.js`. The plugin used to be added only when `BLOB_READ_WRITE_TOKEN`
  was set, so the locally generated map never had it. It is now always registered
  (`enabled` follows the token) — keep it that way, or regenerate the map with the token set.
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
  - **Two kinds of vendor, kept apart (2026-10-14).** Marketplace vendors list themselves
    for couples to contact directly; **partner** vendors apply to work on events Zenfest
    plans (`/vendors/partner`: `VendorForm` → `vendor-applications` → team email +
    Airtable). `/vendors` is a chooser between the two. The partner questions are **no
    longer required** for a marketplace listing (the dashboard's Questions tab is gone; a
    line links to `/vendors/partner` instead). A logged-in vendor who applies is still
    linked: `requireVerifiedPhone` strips any client-sent `vendor`, stamps the session's
    vendor + trusts its phone, and `linkVendorApplication` links it back and seeds an empty
    price card. `VendorForm`'s `account` prefill mode is kept but currently unused.
  - **One way to join while the marketplace is closed (owner, 2026-10-22):** two choices
    where one is "Coming soon" confused vendors. So `VENDORS_HREF` (`lib/features.ts`) sends
    every "For vendors" link (header button, bottom bar) straight to `/vendors/partner`;
    `/vendors` redirects there; `VendorPaths` shows only the partner card (homepage heading
    "Grow with Zenfest") and the phone hero only the partner slide. All of it returns as
    before when `FEATURES.marketplace` is `true`; at launch, word the two by outcome ("Zenfest
    brings you work" / "couples book you directly").
  - **Service catalogue (`lib/serviceCatalog.ts`, owner's list 2026-10-14):** 42 services in 10
    groups (Main Services, Bride & Groom, Traditions & Rituals, Cakes/Gifts/Invites, Entries &
    Effects, Entertainment, Photo Fun, Guest Stations, Kids' Zone, Event Staff). The partner form's
    "What you offer" lists every service grouped (`servicesByGroup()`); only `vendor: 'on'` ones are
    selectable — Photography & Videography and Home Cake (Bakers) so far — the rest show greyed
    "(coming soon)", with a "WhatsApp us / call us" note for them and anything not listed.
    Services are switched on one at a time — steps in the file's header (enum option + migration +
    questions; the first non-photo/cake one needs the common "services & prices" section). The
    marketplace categories should move onto this catalogue at launch.
  - Payload rejects a cookie session unless the request carries a browser
    `Origin` in `csrf` or `Sec-Fetch-Site: same-origin|same-site|none`. So **curl needs
    `-H 'Sec-Fetch-Site: same-origin'`** (or `Authorization: JWT <token>`), and on a phone
    over Wi-Fi (`http://<LAN IP>:3000`) Server Actions see you as logged out — the LAN
    origin isn't in `csrf` (dev only).
  - Without SMTP, Payload logs only an email's subject; `collections/accountAuth.ts`
    prints the **password-reset and confirm-email links** to the dev console so they can
    be tested. Production needs SMTP for resets.
  - **Email confirmation** is Payload's `auth.verify`: a new account can't log in (and its
    JWT is rejected) until `_verified`. `signUp` returns `checkEmail` instead of logging in;
    `/account|vendors/verify-email?token=` confirms; `resendVerification` re-sends the stored
    token. `emailChecksOn()` (`lib/marketplaceMail.ts`) = SMTP set **or** dev — production
    without SMTP creates accounts already confirmed. The 2026-10-05 migration backfilled
    `_verified = true`; anything that creates accounts in code (seeds, scripts) must pass
    `_verified: true` + `disableVerificationEmail` or the account is locked out.
  - **Continue with Google** (`lib/googleAuth.ts`, `/auth/google` → `/auth/google/callback`,
    under `/auth` not `/api`): hand-rolled OAuth code flow + PKCE, profile from the userinfo
    endpoint, no extra packages; buttons only when `GOOGLE_CLIENT_ID/SECRET` are set. Known
    `googleId` or email → `startSession()` in `lib/session.ts` (passwordless login built from
    Payload's own `addSessionToUser` + `getFieldsToSign` + `jwtSign`); an email account gets
    `googleId` linked and `_verified`. New → signed `zf_google_pending` cookie →
    `/account|vendors/complete-signup` (`AuthForm` mode `google`, `completeGoogleSignUp`)
    for the phone/business fields; the password is random. Sign-up validation is shared by
    both paths (`checkSignUpFields`).
  - Booking an enquiry ("Mark booked") also blocks that date; date search hides vendors
    who blocked it. `areas` is a text `hasMany` (validated against `MARKET_AREAS`) to avoid
    enum migrations; categories/units/statuses *are* enums → `migrate:create` on change.
  - `/signup` is still the ₹100-offer form — account pages live at `/account/signup` and
    `/vendors/signup`.
- **Zenfest Shop (`/shop`, `collections/Products.ts`, `lib/shop.ts`, `lib/shopOptions.ts`) —
  phase A of an event-only store.** The owner wants affiliate + dropshipping + a seller
  marketplace mixed, **without GST** (turnover < ₹15L) but selling all over India. So Zenfest
  is a **platform, never the seller of goods**: each product's `source` is `affiliate` (bought
  on Amazon/Flipkart/FNP via `/shop/go/[id]` → `toAffiliateUrl()`, click logged in
  `registry-clicks` with `product`) or `seller` (a marketplace vendor sells, ships and is paid
  directly; Zenfest bills commission later). `zenfest` (own stock) exists in the enum but is
  filtered out everywhere until GST — selling goods inter-state needs GST from ₹1, and
  collecting buyers' money for sellers makes Zenfest a TCS-collecting e-commerce operator.
  Research and phases B/C are in `IDEAS.md`. Easy to get wrong:
  - `lib/shop.ts` is the privacy boundary (like `lib/marketplace.ts`): only `published`, non-
    `zenfest` products; seller products appear only while their vendor listing is live; sellers
    shown by business name only.
  - Every card/page states who sells, delivery and returns ("Sold by" box) — required for
    mixing the models honestly; affiliate pages carry a commission disclosure.
  - `occasions` is text `hasMany` validated against `SHOP_OCCASIONS` (no enum migration);
    `productType`, `source`, `shipsTo` are enums → `migrate:create` on change.
  - **The gift registry lives inside the shop**: nav "Gift Registry" became "Shop" (still nine
    links; `also: ['/registry']` keeps it lit on registry pages). The registry dashboard's
    "Pick gifts from the Zenfest Shop" stores `{slug, key, title}` in localStorage
    (`zenfest-registry-host`, `components/shop/AddToRegistry.tsx`); product pages then call
    `addProductToRegistry` (registry/actions.ts), which re-checks the manage key, dedupes per
    product and stores an `affiliate_link` item with `product` set and an **absolute**
    `imageUrl` (the host's editor only accepts https). `/r/[slug]/go/[itemId]` sends gifts with
    a `product` to its partner store (tagged) or its shop page — never wraps a zenfestevents.in
    URL with the affiliate template.
  - `/shop/policies` holds the E-commerce Rules text (who sells, returns, grievance officer —
    the officer's name is still a placeholder constant in that file).
  - Styles in `shop.css` (after `marketplace.css`), class prefix `sp-`; reuses `mk-hero`,
    `mk-cats`, `mk-section-head`.
- **"Earn from events" (`/earn`) is hosts-only.** Modelled on joinmywedding.com: families
  in Tamil Nadu apply (`HostForm` → `/api/host-applications`) to let foreign travellers
  attend their wedding or function for a fee. Guest browsing, booking and payment are
  **deliberately not built** — the team verifies families and arranges guests and payouts
  offline (`payoutNotes` in the admin). Earnings shown are constants (`EARNINGS`) in
  `earn/page.tsx`. Option lists (incl. `HOST_CITIES`, Tamil Nadu only for now) live in
  `lib/hostOptions.ts`; they are Postgres enums, so adding a city needs `migrate:create`.
  Reached from the homepage band ("Earn from events" button), the header nav and footer.
- **Runs club (`collections/Runs.ts`, `globals/RewardSettings.ts`, `lib/rewards.ts`,
  `lib/rewardTiers.ts`, `hooks/runsClub.ts`, `/invite/[code]`), 2026-10-24.**
  Screens:
  - The dashboards' **Scorecard** tab (`components/market/Scorecard.tsx`, fed by
    `scorecardProps()`).
  - The public `/rewards` page (404s while `FEATURES.marketplace` is off).
  - A runs chip on the account button.
  - A gold progress line on the phone bar.

  The account button and the bar share one `/account/session` fetch per page
  (`useAccountSession`), which now also returns the Runs club standing.

  **Referrals: anyone invites anyone (owner, 2026-10-24).** Couples and vendors both
  invite clients and vendors; recruiting vendors is a main goal.
  - **Links:** each member has two, `/invite/<code>` (client) and `?for=vendor`.
    - The route sets `zf_ref`, counts the visit once per browser (`referral-visits`,
      anonymous `zf_vis`), then lands on `/welcome` ("{first name} invited you").
  - **Who gets what:**
    - The friend: `welcome` runs on sign-up (`welcomeReferredAccount`, all three sign-up
      paths; stores `referredBy` on the account).
    - The inviter, small: `referral_signup` when the friend joins, enquires or applies.
      Source `phone:<10 digits>`, so once per person. Capped by `referralMonthlyCap` per
      30 days.
    - The inviter, big: `referral` when a client books, `referral_vendor` when a partner
      application is **approved (update only, so a public create can't pay out)** or a
      vendor listing goes live.
  - **Partner applications** get `referredBy` from the cookie in
    `stampApplicationReferral`, which runs *before* `requireVerifiedPhone`.
  - **Leads from a referred couple** keep crediting the inviter after the 60-day cookie
    expires.
  - **`/refer`** shows the live tracker from `getReferrals()`.
    - That function is the privacy boundary: first name + initial only, no phones.
    - Stages: client joined/enquired → talking → quote sent → booked; vendor joined/applied
      → under review → approved/live.
    - It refreshes every 60 s while open. Loyalty points
  for couples and vendors (owner): runs can't be bought, have no cash value, nothing is
  chance-based; a tier's ₹ off is honoured by staff when quoting (Leads show the couple's
  tier in the sidebar). Runs per action and tiers are in `/admin` → Rewards. Easy to get wrong:
  - **One award once** = the unique index on `runs` (`accountKey`, `reason`, `source`), like
    `poll-votes`. `awardRuns()` swallows the duplicate inside a Postgres **savepoint** — a
    failed INSERT would otherwise abort the hook's whole transaction and sink the lead /
    account save. Award from hooks with `awardQuietly(payload, { …, req })`.
  - An account's `runs` field is a cache of the sum of its rows, rewritten with
    `context.skipRuns` (which every award hook checks, so nothing loops). `withContext` puts the
    request's context back afterwards — Payload merges a nested call's `context` into `req`.
  - Leads: `customer` comes **only** from the session (`req.user.collection === 'customers'`)
    and `referredBy` only from the httpOnly `zf_ref` cookie (`/invite/<code>`, 60 days), both
    stamped by `stampLeadAccounts`; client-sent values are dropped, and a code that is the
    submitter's own account or phone is ignored. `doc` in `afterChange` has been through
    afterRead (admin-only fields hidden for a couple's REST create), so read them from `data` too.
  - Sources: `joined` / `profile` / `enquiry` / `listing_live` are once per account
    (`account`); `booking` + `referral` are `lead:<id>` (status → Booked), `vendor_reply` +
    `vendor_booking` are `enquiry:<id>`. Staff's `manual` rows get a random source.
  - Referral codes: 8 characters, set on create (`assignReferralCode`); the 2026-10-24 migration
    back-filled existing accounts; `getScorecard()` fills any still missing (local SQLite push).
  - `npm run test:rewards` (local SQLite only). The Postgres savepoint path was not run locally.
  - Cricket names stay generic (DESIGN.md list): Debut … Hall of Fame, Net Bowler … Player of
    the Series.
- **Decoration catalog (`/admin` → Decorations; `collections/Decor*.ts`,
  `globals/DecorSettings.ts`, `hooks/decorPrices.ts`, `lib/decorOptions.ts`,
  `components/admin/decor/*`), owner 2026-10-31.** Decorations collected from suppliers, with
  photos and prices. The team enters everything in /admin. The site will show photos to
  everyone and prices only to logged-in couples (step 4, not built yet). It is built in six
  steps, each stopped for the owner to test:
  1. plan;
  2. database + admin list (done);
  3. phone photo upload + Quick add, and the longer event-type list (done);
  4. public `/decorations`;
  5. CSV import;
  6. PDF/PPTX export + README.

  Easy to get wrong:
  - **The vendor (cost) price must never reach the public.**
    - Every `decor-*` list is staff-only over REST and GraphQL.
    - `vendorPrice`, `supplier`, `notes`, `margin` and the price-history join carry their own
      `canViewField` read rule as a second wall.
    - The site may read items only through a server-only boundary file (`lib/decorations.ts`,
      step 4), like `lib/shop.ts`, copying out an explicit list of public fields.
    - Exports must leave out the vendor price and supplier too.
    - `test:decor` checks visitors, couples and vendors against every list.
  - **Decor photos:** files are public (`isReadingStaticFile` in `readPhotos`), but the records
    are staff-only, so nobody can page through every upload. Uploads get a random file name,
    because phone file names can carry a supplier's name. Payload keeps a **2560 px (long
    edge) WebP master** (owner, 2026-10-31) with `thumbnail` 400, `card` 800×600 and `large`
    1600 sizes. Vercel Blob in production.
  - **Phone photos are shrunk on the phone before upload** (`components/admin/decor/uploadPhotos.ts`:
    canvas → ≤ 2560 px JPEG q0.9, under 3.8 MB, EXIF/GPS dropped). Vercel refuses request bodies
    over ~4.5 MB, so camera photos (5–12 MB) failed with a bare "Failed to upload" through
    Payload's own uploader. So the Photos field is **our own `Field` component**
    (`PhotosField.tsx`, `useField`): thumbnails (first = cover, "Make cover", ×) and one
    "Add photos" button. Payload's "Create New / Choose from existing" box is gone from the
    decoration form on purpose (owner found both confusing, 2026-10-31). **Quick add**
    (`/admin/decor/quick-add`, a custom admin view in `payload.config.ts` → `admin.components.views`)
    saves a Draft. HEIF photos (Samsung "High efficiency pictures") can't be opened by Chrome on
    Android; `uploadPhotos.ts` says how to switch it off.
  - **Event types (owner, 2026-10-31)** are grouped (`DECOR_EVENT_GROUPS`): wedding functions,
    birthdays (boy / girl / first boy / first girl / surprise), family functions, business &
    others. The step-2 catch-all `birthday` stays in the enum for existing items but is hidden
    for new choices (`filterOptions` in the form, `validate` with `previousValue` on the server).
    "Shop Opening" is labelled "Opening ceremony" (value `shop_opening`, new code OPN). "Others"
    / category "Other" require `eventTypeOther` / `categoryOther`, cleared when the choice changes;
    show them with `eventTypeText()` / `categoryText()`.
  - **Item codes** (`WED-STG-014`) are given once on create (`assignItemCode`): the max running
    number for that event + category prefix, plus one. They never change, because quotes cite
    them. The unique index catches two saves at the same instant.
  - **Every price change writes a `decor-price-history` row** (old → new, who) and stamps
    `priceUpdatedOn`, both from `stampPriceChange` / `recordPriceHistory`. Nobody can write
    history by hand.
  - Status: Draft (Quick add, not on the site) / Active (needs photo, title, client price) /
    Archived. Delete is Owner-only: archive instead.
  - Anti-scraping (owner's question): per-item `publicDisplay` (**exact by default**, owner
    2026-10-31; range / from / hidden per item),
    a per-couple daily price limit (`decor-views`, unique per customer + item + India day,
    Decor settings → 40), `customers.decorBlocked`, and the Owner-only "Decor price views" list.
  - `customers.decorShortlist` / `decorBlocked` are staff-read fields, so a couple's own
    `/api/customers/me` never carries them; the site reads them with `overrideAccess`.
  - Themes, categories and event types are select enums: adding one needs `migrate:create`.
  - `decor-suppliers` is a separate staff-only list, not marketplace `vendors`, because most
    suppliers have no login. `vendorAccount` links one when they do.
  - The admin quick filters (`QuickFilters.tsx`) write Payload's own `where[and][i]…` URL, so
    the search box, sorting and paging keep working with them.
- **Occasion reminders (`/admin` → Occasion Reminders; `collections/Contacts.ts`,
  `Reminders.ts`, `globals/ReminderSettings.ts`, `lib/occasions/*`) — internal only.**
  The owner wanted yearly birthdays/anniversaries of past clients and unconverted leads
  pitched on WhatsApp before each date (repeat business + second chance at leads). Data
  mostly comes from staff (WhatsApp chats, calls, the old event list via
  `npm run import:occasions`); website leads/sign-ups feed in only when Reminder
  Settings → `ingestWebsite` is ticked (off: site data was dummy at launch), arriving
  `verified: false`. Easy to get wrong:
  - **Dates are India calendar dates.** Payload stores UTC; a "9 Oct" picked in an IST
    browser is `8 Oct 18:30Z`. All maths goes through `lib/occasions/dates.ts`
    (`istYmd`, `nextOccurrence`) and stored dates are noon IST (`ymdToIso`). 29 Feb →
    28 Feb in other years. With a known year only real anniversaries count, so an
    enquiry for a wedding next month yields its 1st anniversary, never a "0th".
  - Occasions are an **array on the contact** (one form for staff), not a collection.
    A reminder points at the row by `occasionId`; the unique index
    (`occasionId`, `occurrenceYear`) makes the daily run idempotent — don't replace it
    with a read-then-write check.
  - The daily run is `GET /api/reminders/cron` (Vercel Cron, 09:00 IST, `CRON_SECRET`
    bearer, or a signed-in admin; `?date=YYYY-MM-DD` / `?digest=0` for testing). Saving a
    contact also creates any reminder already inside its lead time (`syncReminders`),
    skipped when `context.skipReminderSync` (the run's own date roll-forward).
  - Sending is **manual and free**: the list cell / dashboard button opens a pre-filled
    `wa.me` link and PATCHes the reminder to `sent`. Cloud API auto-send (marketing
    templates, ≈₹1/msg in India) is a deliberate later phase.
  - "Interested"/"Booked" creates a Lead with `context.skipNotify` (no "new enquiry"
    email for a lead staff made) and `fromReminder` (so the website-ingest hook skips it).
  - Phones are stored as `91XXXXXXXXXX` (`toWaNumber`), unlike the 10-digit
    `normalizePhone` used elsewhere — contacts must allow NRI numbers.
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
