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
why the horizontal pairing exists. Phones keep the full pairing too — the emblem plus
"ZENFEST EVENTS™" — since the bar only holds the logo and the menu button there (the
wordmark shrinks slightly below 340px).

## Signature
Kolam (Tamil threshold line-art), rendered in gold line-work — a subtle "welcome" motif
on the hero, dividers, and around the gallery. Kept restrained so it complements, not
competes with, the emblem. The divider is a thin gold stroke (`.kolam-divider`), never a
filled shape — it closes the phone hero's text band and separates sections elsewhere.

A second, smaller echo is **zari** — the gold thread border of a silk saree: the phone
bar's gold "Enquire" button has a slow sheen crossing it, and the vendor button is
outlined in a double gold line.

## The hero
**Laptop and desktop:** one full-bleed, scroll-scrubbed film of a real Zenfest reception. Scrolling drives the
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

**Phones (≤720px): a still welcome, not the film.** Touch-scrubbing a 20 MB film was slow
and laggy, so phones get the team image instead — the whole Zenfest crew (caterer,
photographer, decorator, makeup, mehendi, baker, return gifts, MC, DJ, magician, dancer,
Iyer, Mangala Vadyam) around the mascot, who offers the welcome tray, with a baked-in
speech bubble: *"Vanakkam! Welcome to Zenfest Events — Let's plan your event!"*
- **Shown whole, never cropped.** Full width, starting just under the header. Cropping it
  to fill the screen cut people off at the sides and tucked the bubble under the header.
- **Text goes below the image, never on it.** A dark band under it holds, in order: the
  gold location line, the headline, the description, and a kolam divider.
- **Actions live in the bottom bar, not the hero** (see Quality floor).

## Motion (restrained)
Hero: the scroll-scrubbed film above. Elsewhere the kolam line draws itself once and
gallery items get a one-shot scroll-reveal. `prefers-reduced-motion` fully respected —
the hero becomes an ordinary stacked section on a still poster, with no video fetched.

## Pages & sections
- **Home:** Hero (film on desktop, team image on phones) + featured gallery + services
  grid (on `band-soft` background). With no projects in the CMS, the gallery shows a
  "Coming soon" panel on its own — it disappears once the first project is added.
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
Mobile-first, visible keyboard focus, accessible contrast. On phones a dark sticky bottom
bar on every page carries the three actions: **WhatsApp** (green) · **Enquire** (gold
zari, → /contact) · **Enroll as a vendor** (double gold outline, → /vendors). There is
no Call button there; the phone number lives on the Contact page and in the footer.
Text over imagery must stay legible at the film's brightest frame, not just its average one.
All form fields are accessible with labels; submission handling includes email notification
(when SMTP is configured).
