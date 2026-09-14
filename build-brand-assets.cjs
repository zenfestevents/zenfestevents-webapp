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
  await sharp(circular).resize(512, 512).png().toFile(path.join(appDir, 'icon.png'))
  await sharp(circular).resize(180, 180).png().toFile(path.join(appDir, 'apple-icon.png'))

  console.log('Brand assets written:')
  console.log(' -', path.join(pub, 'logo-full.png'))
  console.log(' -', path.join(pub, 'emblem.png'))
  console.log(' -', path.join(appDir, 'icon.png'))
  console.log(' -', path.join(appDir, 'apple-icon.png'))
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
