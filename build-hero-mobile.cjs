const sharp = require('sharp')
const path = require('path')

// Regenerate the phone hero still (ScrubHero's <source media={MOBILE_QUERY}>) from the
// untracked master at the repo root:
//   node build-hero-mobile.cjs
// One file per common phone width so a phone downloads close to what it shows. Quality 66:
// the busy petals/sparks hide WebP artefacts, and higher settings barely changed the look.
const SRC = path.join(__dirname, 'hero-mobile-source.png.png')
const OUT = path.join(__dirname, 'public', 'hero')
const WIDTHS = [720, 860, 1080, 1290] // keep in step with the srcSet in ScrubHero.tsx

async function run() {
  for (const w of WIDTHS) {
    const file = path.join(OUT, `poster-mobile-${w}.webp`)
    const info = await sharp(SRC, { limitInputPixels: false })
      .resize({ width: w, kernel: 'lanczos3' })
      .webp({ quality: 66, effort: 6, smartSubsample: true })
      .toFile(file)
    console.log(` - ${file} ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`)
  }
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
