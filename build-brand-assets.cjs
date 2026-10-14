const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

// Regenerate favicon + header/footer logo assets from the source logo:
//   node build-brand-assets.cjs
const SRC = path.join(__dirname, 'brand', 'logo-source.webp')
const pub = path.join(process.cwd(), 'public', 'brand')
const appDir = path.join(process.cwd(), 'src', 'app')
fs.mkdirSync(pub, { recursive: true })

// Emblem crop (circular mark) from the 1440x1440 source.
const crop = { left: 420, top: 220, width: 600, height: 600 }
// Circular alpha mask so corners are transparent (blends on any dark bg).
const S = crop.width
const mask = Buffer.from(
  `<svg width="${S}" height="${S}"><circle cx="300" cy="296" r="284" fill="#fff"/></svg>`,
)
async function run() {
  // Full stacked logo (footer, on dark) — PNG.
  await sharp(SRC).resize({ width: 760 }).png().toFile(path.join(pub, 'logo-full.png'))

  // Composite the circular mask once at full crop size, then resize the result.
  const circular = await sharp(SRC)
    .extract(crop)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  await sharp(circular).resize(256, 256).png().toFile(path.join(pub, 'emblem.png'))
  // Favicon: 192px (a multiple of 48, as Google Search wants) — the browser downloads it
  // on every page, and the old 512px one weighed 360 KB.
  await sharp(circular).resize(192, 192).png({ palette: true, quality: 90, effort: 10 }).toFile(path.join(appDir, 'icon.png'))
  await sharp(circular).resize(180, 180).png().toFile(path.join(appDir, 'apple-icon.png'))

  // What the public pages actually show, at 3x their CSS size (2x for the footer): the
  // PNGs above stay for the admin, the AI chat and social-card fallbacks.
  const WEBP = { quality: 85, alphaQuality: 100, effort: 6 }
  await sharp(circular).resize(132, 132).webp(WEBP).toFile(path.join(pub, 'emblem.webp')) // header, 44px
  await sharp(SRC).resize({ width: 380 }).webp(WEBP).toFile(path.join(pub, 'logo-footer.webp')) // footer, 190px
  // wordmark.png is hand-extracted (see CLAUDE.md), so its WebP is derived from it.
  await sharp(path.join(pub, 'wordmark.png')).resize({ height: 90 }).webp(WEBP).toFile(path.join(pub, 'wordmark.webp')) // header, 30px tall

  console.log('Brand assets written:')
  console.log(' -', path.join(pub, 'logo-full.png'))
  console.log(' -', path.join(pub, 'emblem.png'))
  console.log(' -', path.join(pub, 'emblem.webp'))
  console.log(' -', path.join(pub, 'logo-footer.webp'))
  console.log(' -', path.join(pub, 'wordmark.webp'))
  console.log(' -', path.join(appDir, 'icon.png'))
  console.log(' -', path.join(appDir, 'apple-icon.png'))
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
