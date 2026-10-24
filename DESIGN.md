# Zenfest Events — Visual Direction

Derived from the official **gold-on-black** brand logo (emblem with a stylised "Z",
photographer + couple silhouettes; "ZENFEST" bold condensed logotype; tagline
"Your Gateway to Stress-Free Celebrations"). The logo, its colours and its text never change.

## Night match (owner, 2026-10-24)
The site is a **floodlit cricket ground at night**, and the web app plays like a game:
scoreboards, overs, levels, unlocks. Cricket is what everyone in Tamil Nadu connects with.
The look is **mostly dark**; ivory survives only as `.surface-paper` for features that still
carry their own light styling (gift registry, shop, polls, Zenfest AI).

### Brand safety: generic cricket only
- **Allowed:** stumps, bails, ball seam, pitch, scoreboard, overs, floodlights, a generic
  gold trophy, and words like Powerplay, Super Over, Free Hit, Hat-trick, Century, Sixer,
  Yorker, Man of the Match, Duck, Captain, Debut, Drinks Break and Howzat.
- **Never:** IPL, BCCI, ICC, or any league, team (or abbreviation), player, stadium or
  sponsor name. Never a team's colour pair.
- **Never, not even in playful copy:** "Whistle Podu", "Orange Cap", "Purple Cap",
  "Strategic Timeout".
  - "Whistle Podu" is a registered Class 41 trademark of Chennai Super Kings Cricket Ltd
    (no. 3903998). Class 41 covers our own event services.
  - The other three are sponsored IPL properties.
  - Use instead: Zenfest Gold Cap / Top Scorer, Wicket Taker, Drinks Break,
    Howzat! / Semma shot! / Vera level!
- **Gold stays the logo's muted gold.** Never push it to bright yellow, which reads as a
  team colour.
- **The Runs club is a loyalty programme, not a game of money or chance.** Runs can't be
  bought and have no cash value. There are no spin wheels and no prediction prizes.

### Future package names
- Powerplay (starter)
- Boundary / Sixer (mid)
- Half-Century / Century (full)
- Hat-trick (engagement + wedding + reception)
- Super Over (last-minute add-on)

### The brand mix
Each part is borrowed from a different system in `Design/awesome-design-md-main`:

| Part | From | On Zenfest |
|---|---|---|
| Surfaces | Linear, Raycast, Warp | `--pitch-0..3` warm blacks; raised = lighter, not shadowed; translucent hairlines |
| Card top edge | Shopify, Framer | `--edge-light`, a floodlight catching the top edge |
| Section glow | Resend, Replicate | `--floodlight`, one layered gold glow from above per section |
| Score ticker | Al Jazeera, Jobright | `Ticker` above the bar: LIVE dot + real facts, pauses on hover / reduced motion |
| Laptop nav | Mastercard, Apple, Oracle | floating translucent pill, gold hairline, blur; short gold bar under the active link |
| Dropdowns | Airbnb, Tesla | numbered items with a one-line hint |
| Hamburger | Lamborghini | the word MENU beside the bars |
| Phone menu | PlayStation, BMW M, Binance | full-screen drawer from the left, gold team stripe, main buttons pinned at the bottom |
| Service cards | Ferrari driver card, NVIDIA | player cards: mono squad number + the gold bails (`.corner-mark`) |
| Featured card | Revolut, The Verge | one gold-filled card per grid (`.card--featured`) |
| Our Work | PlayStation / 1win rails | phones: 16:9 tiles snapping sideways |
| Buttons | Binance, Apple, SpaceX | gold with dark text; press = scale .95; `.btn--outline-gold` uppercase secondary |
| Big numbers | Ferrari, Binance, Stripe | `Scoreboard`: tabular Oswald numbers over mono captions, **real numbers only** |
| Rating | Airbnb | `LaurelRating`, generic laurels around the Google score |
| Steps | Binance, Meta, DJI | each step is a ball of the over (`.evq__dot`, `BallDots`); chosen options get a gold ring |
| Ticks | Starbucks | checkboxes pop on a spring curve |
| Tiers | Starbucks Rewards, PlayStation | tier cards with a gold bar on top, level badge, perks |
| Progress | Oura | `GoldRing` |
| Achievements | Raycast | `TierBadge`, a gold key-cap |
| Big moments | Nintendo box art | `.howzat`, outlined gold display type ("Howzat!", "Clean bowled"); sparingly |
| Closing band | Superhuman, Together.ai | a faint stencilled ZENFEST behind the final call to action |

## Palette (from the logo)
- `--ink` #0d0d0d (near-black)
- `--marigold` #d9b24c (brand gold: accent, CTAs)
  - `--marigold-bright` #f3de8e (champagne highlight)
  - `--marigold-deep` #a9791f (bronze)
- Ivory (paper only): `--blush` #f6f1e7 and `--jasmine` #fbf7ee (also the text colour on dark)
- `--clay` #6f6455 (muted text on paper)
- The ground: `--pitch-0` #0b0907 → `--pitch-3` #26201a

**Components use the semantic tokens, never the raw palette,** for anything that differs
between the dark ground and paper:
- `--surface`, `--surface-1..3`
- `--text`, `--text-muted`
- `--line`, `--line-strong`
- `--link` (small gold text)
- `--ok`, `--err`

`.surface-paper` flips them all back to ink on ivory. `.band-ink` forces them dark.

## Typography
- **Display:** Oswald. A bold condensed sans echoing the "ZENFEST" logotype.
- **Body/UI:** Hanken Grotesk.
- **Scoreboard:** JetBrains Mono 500, used for eyebrows, the ticker, overs, squad numbers and
  captions. It is not preloaded, so it never delays the first paint.
- All are self-hosted via `next/font`. Accent words are gold (`.accent`), not italic. All
  figures use tabular numerals.

## Logo
Gold-on-black emblem + wordmark. On laptops it sits in the floating pill; on phones it sits
in the solid bar.
- `emblem.webp` + `wordmark.webp` beside each other in the bar.
- `logo-full.png` (the square stacked lockup) only in the footer.
- Phones keep the full "ZENFEST EVENTS™" pairing.

## Signature
- **Ball seam** (`SeamDivider`): a gold line stitched both sides with the ball at its centre.
  It separates sections and closes the phone hero's text band.
- **The bails:** two small gold bars on the top corner of player cards.
- **Kolam** stays where it means the Tamil welcome: the rotating rosette watermark on page
  heads (`.page-head`), the registry, the 404 and the homepage loading screen.

## The hero
**Laptop and desktop:**
- One full-bleed, scroll-scrubbed film of a real Zenfest reception.
- Two gold heart halves glide together as the film ends.
- A pill at the bottom right bowls **one over**: six balls light up as the film plays
  (`--p`).
- The nav bar (with its ticker) steps aside for the whole hero and returns as the film
  leaves.

Rules learned building it:
- **The film is the subject; nothing sits on top of it.** The heart frames the couple, clear of their faces.
- **Darken only behind the letters** (a contained highlight or chip), never a full-width wash.
- **Never make the visitor wait.** A poster paints instantly. On slow or metered connections
  the film never downloads.

**Phones (≤720px): a still welcome, not the film.**
- The team image is shown whole, never cropped, starting under the header.
- Text goes in the dark band below it, never on the image.
- Actions live in the bottom bar.
- Swipe slides follow for the vendor lanes.

## Surfaces & details
- The page is `--pitch-0` with fine warm grain. Cards are `--surface-1` with a hairline and
  the edge light. Hover lifts a card one step lighter, with a gold-tinted border.
- Headings use `text-wrap: balance`; paragraphs use `pretty`.
- Buttons press (scale .95). Gold buttons cast a gold-tinted shadow on hover.
- Services:
  - "Complete coordination" is the gold card, the "hand us the whole event" option.
  - Player cards are numbered like a squad, not a sequence.
- Form fields are `--surface-2` with `color-scheme: dark`, and a gold focus ring.

## Motion
- The hero film.
- The ticker's slow belt.
- The LIVE pulse.
- The drawer sliding in.
- Ticks popping.
- One-shot scroll reveals.
- The rosette turning slowly.

Under `prefers-reduced-motion` all of it stops: the ticker shows a still list and the hero
becomes a stacked section on a still poster.

## Pages & sections
- **Home:** clients first, vendors after (owner, 2026-10-24).
  - Hero
  - Scoreboard (Google rating, reviews, cities, services: real figures only)
  - Highlights (Our Work)
  - The squad (services)
  - From the stands (testimonials, with the laurel rating)
  - Runs club
  - Then the vendor side: For vendors (two lanes) and the Marketplace band
  - Take guard (closing call to action)
  - No gift registry band while the Shop is off.
- **Plan your event (`/enquire`):** five steps as five balls with an "Over 0.n" readout. Sending
  is the sixth ball, which brings the "Howzat!" thank-you.
- **Refer & earn (`/refer`):**
  - A scoreboard of invites.
  - Two invite cards: a solid gold edge for clients, a dashed edge for vendors.
  - **Live progress:** one row per person, with a ball for each stage they have passed and
    a gold ring on the stage they're at now.
- **Welcome (`/welcome`):** where an invite lands, "{Name} invited you". There are client
  and vendor versions, each with two big choice cards.
- **404:** "Clean bowled". The page is out; back to the pavilion.
- **Loading (Home):** the rosette with "Taking guard…".

All page layouts use the root layout (`app/(frontend)/layout.tsx`), which includes Header,
Footer and MobileCTABar. Registry, shop, polls and plan routes add a `PaperSurface` layout.

## Quality floor
Mobile-first, visible keyboard focus, accessible contrast on both grounds.

On phones a dark sticky bottom bar on every page carries three actions:
- **WhatsApp** (green)
- **Plan your event** (gold zari sheen)
- **For vendors** (double gold outline)

Text over imagery must stay legible at the film's brightest frame. All form fields have
labels.
