'use client'

import Link from 'next/link'
import React, { useEffect, useRef } from 'react'

import { SITE_FALLBACK } from '../lib/site'
import { KolamRosette } from './Kolam'

const HEART_PATH =
  'M50 82 C 20 58, 4 40, 4 24 C 4 11, 15 3, 27 3 C 37 3, 45 10, 50 19 C 55 10, 63 3, 73 3 C 85 3, 96 11, 96 24 C 96 40, 80 58, 50 82 Z'

/** iOS fallback sequence — Safari will not seek a <video> reliably enough to scrub. */
const FRAME_COUNT = 90
const framePath = (i: number) => `/hero/frames/frame_${String(i + 1).padStart(3, '0')}.webp`

function HeartSvg() {
  return (
    <svg viewBox="0 0 100 90" role="presentation" focusable="false" aria-hidden="true">
      <path d={HEART_PATH} />
    </svg>
  )
}

/** Emphasise the last word of the headline in marigold. */
function renderHeadline(headline?: string) {
  const text = headline || SITE_FALLBACK.hero.headline || ''
  const parts = text.trim().split(' ')
  if (parts.length < 2) return text
  const last = parts.pop()
  return (
    <>
      {parts.join(' ')} <span className="italic accent">{last}</span>
    </>
  )
}

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Mac/.test(navigator.userAgent) && 'ontouchend' in document)
  )
}

/**
 * Some visitors are on metered or slow mobile data — a surprise 10 MB video is not
 * acceptable there. They keep the poster; every other layer still animates.
 */
type NetworkInfo = { saveData?: boolean; effectiveType?: string }

function shouldSkipHeavyMedia() {
  const c = (navigator as Navigator & { connection?: NetworkInfo }).connection
  if (!c) return false
  if (c.saveData) return true
  return ['slow-2g', '2g', '3g'].includes(c.effectiveType ?? '')
}

type Props = {
  headline?: string
  subheadline?: string
  waHref: string
  hasWhatsapp?: boolean
  line?: string
  hint?: string
}

/**
 * Full-bleed scroll-scrubbed hero. The reception film fills the viewport and is
 * scrubbed by scroll position; on the same progress the gold heart halves glide
 * together and meet as the film ends.
 *
 * Progress is published as an inherited `--p` (0→1) custom property on the outermost
 * <section>, so every child maps it to transforms/opacity in CSS. Respects
 * prefers-reduced-motion and save-data.
 */
export function ScrubHero({
  headline,
  subheadline,
  waHref,
  hasWhatsapp = false,
  line = 'Two hearts, one celebration',
  hint = 'Scroll to see the magic',
}: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    // Teardown registry — every path below pushes its own cleanup here.
    const cleanups: Array<() => void> = []
    const run = () => cleanups.forEach((fn) => fn())

    cleanups.push(() => document.body.classList.remove('hero-immersive'))


    /* ---------- progress ---------- */
    let rafId = 0
    let ticking = false
    let onProgress: ((p: number) => void) | null = null

    const update = () => {
      ticking = false
      const vh = window.innerHeight
      const rect = section.getBoundingClientRect()
      const total = section.offsetHeight - vh
      const scrolled = Math.min(Math.max(-rect.top, 0), total)
      const p = total > 0 ? scrolled / total : 1
      section.style.setProperty('--p', p.toFixed(4))
      section.classList.toggle('is-joined', p > 0.985)
      // The intro fades to 0 but would still swallow clicks over the film.
      section.classList.toggle('is-past-intro', p > 0.34)
      /* The header greets you at rest, steps away the moment you start scrolling,
         and stays away for the whole hero — returning only once the film is
         actually leaving the screen.
         Two separate tests, because neither alone works. "Has scrolling started"
         uses scrollY rather than progress: the hero is pulled up under the header
         by a negative margin, so progress is already non-zero at rest. "Is the
         film gone" uses the section's bottom edge rather than progress: progress
         hits 1 while the stage is still pinned and filling the viewport, which
         would put the bar back on top of the film. */
      const started = window.scrollY > 24
      const filmStillOnScreen = rect.bottom > vh * 0.85
      document.body.classList.toggle('hero-immersive', started && filmStillOnScreen)
      if (onProgress) onProgress(p)
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        rafId = requestAnimationFrame(update)
      }
    }

    /* ---------- reduced motion: hearts already joined, no media fetched ---------- */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.classList.add('is-reduced', 'is-joined', 'is-ready')
      section.style.setProperty('--p', '1')
      return run
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('orientationchange', onScroll)
    cleanups.push(() => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('orientationchange', onScroll)
    })

    // Poster-only: the hero is complete, just not filmic.
    if (shouldSkipHeavyMedia()) {
      section.classList.add('is-ready', 'is-poster-only')
      return run
    }

    /* ---------- iOS: canvas image sequence ---------- */
    const startCanvasSequence = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      videoRef.current?.remove()
      canvas.hidden = false

      const imgs: HTMLImageElement[] = new Array(FRAME_COUNT)
      let loaded = 0
      let ready = false
      let target = 0
      let current = 0
      let lastDrawn = -1
      let running = false
      let seqRaf = 0

      const sizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.round(canvas.clientWidth * dpr)
        canvas.height = Math.round(canvas.clientHeight * dpr)
        lastDrawn = -1
        draw(Math.round(current))
      }
      const drawCover = (img?: HTMLImageElement) => {
        if (!img || !img.width) return
        const cw = canvas.width
        const ch = canvas.height
        const ir = img.width / img.height
        const cr = cw / ch
        let dw: number
        let dh: number
        if (cr > ir) {
          dw = cw
          dh = cw / ir
        } else {
          dh = ch
          dw = ch * ir
        }
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
      }
      const draw = (i: number) => {
        if (i !== lastDrawn) {
          drawCover(imgs[i])
          lastDrawn = i
        }
      }
      // Self-suspending: eases toward the scroll target, then stops so the page idles.
      const loop = () => {
        current += (target - current) * 0.14
        const settled = Math.abs(target - current) < 0.01
        if (settled) current = target
        draw(Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(current))))
        if (settled) {
          running = false
          return
        }
        seqRaf = requestAnimationFrame(loop)
      }
      const kick = () => {
        if (ready && !running) {
          running = true
          seqRaf = requestAnimationFrame(loop)
        }
      }

      onProgress = (p) => {
        target = p * (FRAME_COUNT - 1)
        kick()
      }

      for (let i = 0; i < FRAME_COUNT; i++) {
        const im = new Image()
        im.onload = im.onerror = () => {
          loaded++
          if (barRef.current) barRef.current.style.width = `${(loaded / FRAME_COUNT) * 100}%`
          if (loaded === FRAME_COUNT) {
            ready = true
            sizeCanvas()
            section.classList.add('is-ready')
            update()
          }
        }
        im.src = framePath(i)
        imgs[i] = im
      }

      window.addEventListener('resize', sizeCanvas)
      cleanups.push(() => {
        cancelAnimationFrame(seqRaf)
        window.removeEventListener('resize', sizeCanvas)
        imgs.forEach((im) => {
          im.onload = im.onerror = null
        })
      })
    }

    /* ---------- default: video scrub ---------- */
    const startVideoScrub = () => {
      const video = videoRef.current
      if (!video) return

      let blobUrl = ''
      let target = 0
      let current = 0
      let ready = false
      let seeking = false
      let running = false
      let vidRaf = 0
      let aborted = false

      const loop = () => {
        const dur = video.duration || 1
        current += (target - current) * 0.12
        const settled = Math.abs(target - current) < 0.004
        if (settled) current = target
        const t = Math.max(0, Math.min(dur - 0.03, current))
        if (!seeking && Math.abs(video.currentTime - t) > 0.012) {
          seeking = true
          try {
            video.currentTime = t
          } catch {
            seeking = false
          }
        }
        if (settled && !seeking) {
          running = false
          return
        }
        vidRaf = requestAnimationFrame(loop)
      }
      const kick = () => {
        if (ready && !running) {
          running = true
          vidRaf = requestAnimationFrame(loop)
        }
      }

      onProgress = (p) => {
        target = p * (video.duration || 1)
        kick()
      }

      const begin = () => {
        if (ready) return
        ready = true
        section.classList.add('is-ready')
        update()
      }
      const onSeeked = () => {
        seeking = false
        kick()
      }
      const onMeta = () => {
        try {
          video.currentTime = 0.001 // nudge the first frame to paint
        } catch {
          /* ignore */
        }
      }

      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('loadeddata', begin)
      video.addEventListener('canplay', begin)
      video.addEventListener('seeked', onSeeked)

      // Safety net: if neither event fires but metadata is there, start anyway
      // rather than leaving the viewer on the poster forever.
      const failsafe = window.setTimeout(() => {
        if (!ready && video.readyState >= 1) begin()
      }, 2500)
      cleanups.push(() => window.clearTimeout(failsafe))

      /* Fetch into a Blob URL: blob URLs are fully seekable even when the server
         ignores HTTP Range requests, which is exactly what scrubbing needs. */
      fetch('/hero/scrub.mp4')
        .then((res) => {
          if (!res.ok) throw new Error(`http ${res.status}`)
          const total = Number(res.headers.get('Content-Length')) || 0
          if (!res.body?.getReader) return res.blob()
          const reader = res.body.getReader()
          const chunks: Uint8Array[] = []
          let received = 0
          const pump = (): Promise<Blob> =>
            reader.read().then((r) => {
              if (r.done) return new Blob(chunks as BlobPart[], { type: 'video/mp4' })
              chunks.push(r.value)
              received += r.value.length
              if (total && barRef.current) {
                barRef.current.style.width = `${Math.min(100, Math.round((received / total) * 100))}%`
              }
              return pump()
            })
          return pump()
        })
        .then((blob) => {
          if (aborted) return
          blobUrl = URL.createObjectURL(blob)
          video.src = blobUrl
          video.load()
        })
        .catch(() => {
          if (aborted) return
          video.src = '/hero/scrub.mp4' // last resort: stream directly
          video.load()
        })

      cleanups.push(() => {
        aborted = true
        cancelAnimationFrame(vidRaf)
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('loadeddata', begin)
        video.removeEventListener('canplay', begin)
        video.removeEventListener('seeked', onSeeked)
        video.removeAttribute('src')
        video.load()
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      })
    }

    if (isIOS()) startCanvasSequence()
    else startVideoScrub()

    return run
  }, [])

  return (
    <section className="scrubhero" ref={sectionRef} aria-label="Zenfest Events">
      <div className="scrubhero__pin">
        <div className="scrubhero__media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="scrubhero__poster" src="/hero/poster.jpg" alt="" />
          <video
            className="scrubhero__video"
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
          />
          <canvas className="scrubhero__canvas" ref={canvasRef} hidden />
        </div>

        <div className="scrubhero__scrim" aria-hidden="true" />
        <div className="scrubhero__grain" aria-hidden="true" />
        <div className="scrubhero__glow" aria-hidden="true" />
        <KolamRosette size={760} className="scrubhero__kolam" />

        <div className="scrubhero__heart" aria-hidden="true">
          <div className="scrubhero__half scrubhero__half--left">
            <HeartSvg />
          </div>
          <div className="scrubhero__half scrubhero__half--right">
            <HeartSvg />
          </div>
        </div>

        <div className="container scrubhero__content">
          <p className="eyebrow">
            <span className="scrubhero__hl">Chennai · Event Management Company</span>
          </p>
          <h1 className="scrubhero__title display-xl">{renderHeadline(headline)}</h1>
          <p className="scrubhero__lede lede">
            <span className="scrubhero__hl">
              {subheadline || SITE_FALLBACK.hero.subheadline}
            </span>
          </p>
          <div className="btn-row scrubhero__cta">
            <Link className="btn btn--primary" href="/contact">
              Get a callback
            </Link>
            {hasWhatsapp && (
              <a className="btn btn--whatsapp" href={waHref} target="_blank" rel="noopener">
                WhatsApp us
              </a>
            )}
            <Link className="btn btn--gold" href="/gallery">
              See our work
            </Link>
          </div>
          <ul className="scrubhero__tags">
            <li>Weddings</li>
            <li>Birthdays</li>
            <li>Corporate</li>
            <li>Housewarmings</li>
            <li>Sports events</li>
          </ul>
        </div>

        <div className="scrubhero__outro">
          <p className="scrubhero__line">
            {line.includes(',') ? (
              <>
                {line.split(',')[0]},
                <span className="accent">{line.split(',').slice(1).join(',')}</span>
              </>
            ) : (
              line
            )}
          </p>
          <div className="btn-row scrubhero__outro-cta">
            <Link className="btn btn--primary" href="/contact">
              Get a callback
            </Link>
            {hasWhatsapp && (
              <a className="btn btn--whatsapp" href={waHref} target="_blank" rel="noopener">
                WhatsApp us
              </a>
            )}
          </div>
        </div>

        <span className="scrubhero__hint" aria-hidden="true">
          {hint}
        </span>

        <div className="scrubhero__loader" aria-hidden="true">
          <span className="scrubhero__bar" ref={barRef} />
        </div>
      </div>
    </section>
  )
}
