# Zenfest Events — Visual Direction

Derived from the official **gold-on-black** brand logo (emblem with a stylised "Z",
photographer + couple silhouettes; "ZENFEST" bold condensed logotype; tagline
"Your Gateway to Stress-Free Celebrations"). The identity is **luxury, gold on black** —
photos glow like an exhibition against black feature bands.

## Palette (from the logo)
- `--ink` #0d0d0d — near-black (primary dark / feature bands)
- `--marigold` #d9b24c — brand gold (primary accent, CTAs)  ·  `--marigold-bright` #f3de8e champagne highlight
- `--marigold-deep` #a9791f — deep gold / bronze
- `--emerald` #9c6b1a — bronze (rare secondary accent)
- `--blush` #f6f1e7 — warm ivory (light content surfaces)
- `--jasmine` #fbf7ee — lightest (text on dark)
- `--clay` #6f6455 — muted warm taupe (secondary text, hairlines)

Rhythm: airy ivory content sections alternate with black feature bands so the gallery
and CTAs read as premium evening-celebration moments. Accent words are emphasised in
**gold**, not italic.

## Typography
- **Display:** Oswald — bold condensed geometric sans echoing the "ZENFEST" logotype.
  Loaded via `next/font/google` (self-hosted).
- **Body/UI:** Hanken Grotesk — clean, legible on mobile. Loaded via `next/font/google`
  (self-hosted).
- **Labels/eyebrows:** uppercase, letter-spaced (echoing the spaced "EVENTS").
- Both fonts are self-hosted by Next.js; no external font loading required after build.

## Logo
Gold-on-black emblem + wordmark. The header bar is **solid black** so the gold logo sits
on its native ground: the circular emblem (`emblem.png`) beside the "ZENFEST EVENTS"
wordmark (`wordmark.png`, transparent background). The square stacked lockup
(`logo-full.png`) is reserved for the footer — it does not read at bar height, which is
why the horizontal pairing exists. Below 420px the emblem carries the brand alone.

## Signature
Kolam (Tamil threshold line-art), rendered in gold line-work — a subtle "welcome" motif
on the hero, dividers, and around the gallery. Kept restrained so it complements, not
competes with, the emblem.

## The hero
One full-bleed, scroll-scrubbed film of a real Zenfest reception. Scrolling drives the
footage forward and back, and on the same progress two gold heart halves glide together
and meet as it ends — "two hearts, one celebration". The nav bar greets you, steps aside
for the whole hero so nothing covers the film, and returns as the footage leaves.

Rules learned building it:
- **The film is the subject; nothing sits on top of it.** The heart is sized and lifted to
  *frame* the couple, clear of their faces — verified against real frames, not guessed.
- **Darken only behind the letters.** Type over film needs a contained highlight hugging
  the text (or a chip), never a full-width wash — a wash hides the footage, which defeats
  the point of having it.
- **Never make the visitor wait.** A poster paints instantly and the film loads behind it;
  on metered or slow connections the film never downloads and the poster simply stays.

## Motion (restrained)
Hero: the scroll-scrubbed film above. Elsewhere the kolam line draws itself once and
gallery items get a one-shot scroll-reveal. `prefers-reduced-motion` fully respected —
the hero becomes an ordinary stacked section on a still poster, with no video fetched.

## Pages & sections
- **Home:** Hero film + featured gallery + services grid (on `band-soft` background)
- **Gallery (Our Work):** Full project grid, each with category tag, title, cover image
- **Services:** Service cards with descriptions, linked to `/packages` or `/contact`
- **Packages:** Bundled service offerings (currently "Coming soon"; flip `PACKAGES_READY`
  when ready)
- **About:** Company story and values (content managed via Payload CMS)
- **Contact:** Inquiry form (POST to `/api/leads`); includes WhatsApp / Call CTAs
- **Vendor signup:** Partner enrollment form (POST to `/api/vendor-applications`)
- **Signup / offer:** Event details capture (POST to `/api/signups`); branches on
  "planning an event?"

All page layouts use the root layout (`app/(frontend)/layout.tsx`), which includes
Header, Footer, and MobileCTABar. Content sections are wrapped in `.section` containers
with `.container` for max-width and gutter padding.

## Quality floor
Mobile-first, visible keyboard focus, accessible contrast, sticky mobile Call/WhatsApp bar.
Text over imagery must stay legible at the film's brightest frame, not just its average one.
All form fields are accessible with labels; submission handling includes email notification
(when SMTP is configured).
