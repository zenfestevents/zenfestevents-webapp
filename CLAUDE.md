# CLAUDE.md

Guidance for working in this repository.

## Project
Zenfest Events — V1 marketing & lead-generation website for an event management
company near Chennai. Public site + a self-service admin/back-end in one codebase.
**Scope is intentionally limited:** no client login, payments, or client portal. The
`/admin` login is for the business owner/team only. See [README.md](README.md) for
setup and [DESIGN.md](DESIGN.md) for the visual direction.

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
    vendors/page.tsx      Vendor enrollment form
    layout.tsx            Root layout, Header, Footer, MobileCTABar
    styles.css            Design tokens (colors, typography, spacing)
    parts.css             Component & section styles
  app/(payload)/        Payload admin (generated boilerplate — avoid hand-editing)
  collections/          Users, Media, Categories, Services, Packages, Projects,
                        Leads, Signups, VendorApplications
  globals/              SiteSettings
  components/
    Header.tsx, Footer.tsx, MobileCTABar.tsx
    Kolam.tsx            Kolam line-art (KolamRosette, KolamDivider)
    GalleryGrid.tsx      Gallery grid component
    Reveal.tsx           Scroll-in animation (fade/rise)
    ScrubHero.tsx        Full-bleed scroll-scrubbed hero
    InquiryForm.tsx, VendorForm.tsx, SignupForm.tsx  Forms
  lib/
    payload.ts           Payload client (server-side)
    getSettings.ts       getSiteSettings() (server-side, merges fallback)
    site.ts              Client-safe exports (types, helpers, fallbacks)
    media.ts             Media URL helpers
  seed/                  Demo-content seed script
  access/                Access control for collections
  fields/                Custom Payload field types
  hooks/                 Payload hooks (e.g., notifySubmission)
  payload.config.ts      Payload configuration
```
- **Public pages** fetch content through Payload's **Local API** (`getPayloadClient()`),
  marked `export const dynamic = 'force-dynamic'`. Pages: home (featured work + services),
  gallery (all projects), services (all services), packages (with "Coming soon" flag),
  about, contact, signup (with event-planning branch), vendors.
- **Forms** (`InquiryForm`, `VendorForm`, `SignupForm`) POST to Payload's REST API
  (`/api/leads`, `/api/vendor-applications`, `/api/signups`). Public users **create**
  submissions; only admin can **read** them (see `src/access/index.ts`). New submissions
  trigger the `notifySubmission` hook (sends email to `LEAD_NOTIFICATION_EMAIL` when
  SMTP is configured; logs to console otherwise). All submissions auto-save to the DB.
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
  scrubbed by scroll, with the gold heart halves meeting as it ends. Things that are
  easy to get wrong here:
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
  (`body.hero-immersive`) and returns as the film leaves.
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
- **Sign-ups** (`/signup`) capture name, phone, birthday and "planning an event?". Saying
  yes branches into a second step for event details; saying no submits immediately. Each
  record is stamped `offer: SIGNUP100` for the ₹100-off promise in the header CTA —
  **nothing applies the discount automatically**; the team honours it when quoting.
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
[README.md](README.md). Deployment is a later phase and needs the owner's accounts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
