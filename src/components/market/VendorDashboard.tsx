'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  deletePhoto,
  markEnquiryRead,
  replyToEnquiry,
  saveBlockedDates,
  saveGallery,
  saveListing,
  savePrices,
  setEnquiryStatus,
  setPaused,
  submitForReview,
} from '../../app/(frontend)/vendors/actions'
import { logOut } from '../../lib/authActions'
import { listingGapList, needsQuestionnaire } from '../../lib/listing'
import type { PublicPhoto, VendorEnquiry } from '../../lib/marketplace'
import {
  LANGUAGES,
  LISTING_STATUSES,
  MARKET_AREAS,
  MARKET_CATEGORIES,
  PRICE_UNITS,
  type ListingStatus,
} from '../../lib/marketplaceOptions'
import type { VerifyMode } from '../PhoneVerify'
import { VendorForm } from '../VendorForm'
import { EnquiryFacts, EnquiryThread, StatusPill, formatDay } from './EnquiryThread'
import { MonthCalendar } from './MonthCalendar'
import { statusText, useSave } from './useSave'

export type DashboardVendor = {
  id: number
  name: string
  businessName: string
  slug: string
  email: string
  phone: string
  phoneVerified: boolean
  category: string
  otherService: string
  areas: string[]
  about: string
  instagram: string
  languages: string[]
  priceCard: { item: string; unit: string; price: number; gstIncluded: boolean; note: string }[]
  gallery: PublicPhoto[]
  spare: PublicPhoto[]
  coverId: number | null
  blockedDates: { date: string; note: string }[]
  listingStatus: ListingStatus
  reviewNote: string
  hasApplication: boolean
}

type Tab = 'enquiries' | 'listing' | 'prices' | 'photos' | 'availability' | 'questions'

const LOGIN = '/vendors/login'

export function VendorDashboard({
  vendor,
  enquiries,
  verifyMode,
  initialTab,
  welcome,
}: {
  vendor: DashboardVendor
  enquiries: VendorEnquiry[]
  verifyMode: VerifyMode
  initialTab: string
  welcome: boolean
}) {
  const questions = needsQuestionnaire(vendor.category)
  const tabs: [Tab, string][] = [
    ['enquiries', 'Enquiries'],
    ['listing', 'Listing'],
    ['prices', 'Prices'],
    ['photos', 'Photos'],
    ['availability', 'Dates'],
    ...(questions ? ([['questions', 'Questions']] as [Tab, string][]) : []),
  ]
  const live = vendor.listingStatus === 'published'
  const fallback: Tab = live || enquiries.length ? 'enquiries' : 'listing'
  const [tab, setTab] = useState<Tab>(tabs.some(([t]) => t === initialTab) ? (initialTab as Tab) : fallback)
  const unread = enquiries.filter((e) => e.unread).length

  function go(t: Tab) {
    setTab(t)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    url.searchParams.delete('welcome')
    window.history.replaceState(null, '', url)
  }

  return (
    <section className="section section--tight dash">
      <div className="container">
        <div className="dash__head">
          <div>
            <p className="eyebrow">Vendor dashboard</p>
            <h1 className="display-m">{vendor.businessName}</h1>
            <p className="muted dash__meta">
              <ListingPill status={vendor.listingStatus} /> {vendor.email}
            </p>
          </div>
          <div className="dash__head-actions">
            {live && (
              <Link className="btn btn--ghost" href={`/marketplace/v/${vendor.slug}`}>
                View my listing
              </Link>
            )}
            <form action={logOut}>
              <button className="btn btn--ghost" type="submit">
                Log out
              </button>
            </form>
          </div>
        </div>

        {welcome && (
          <div className="dash__notice dash__notice--gold" role="status">
            <strong>Welcome to Zenfest, {vendor.name.split(' ')[0]}!</strong> Build your listing below — about,
            prices and photos — then send it to our team for review. It&apos;s free.
          </div>
        )}
        <StatusPanel vendor={vendor} onGo={go} />

        <div className="reg-tabs reg-tabs--dash" role="tablist">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`reg-tab ${tab === t ? 'is-active' : ''}`}
              onClick={() => go(t)}
            >
              {label}
              {t === 'enquiries' && unread > 0 && <span className="dash__badge">{unread}</span>}
            </button>
          ))}
        </div>

        <div className="dash__panel card">
          {tab === 'enquiries' && <EnquiriesTab enquiries={enquiries} live={live} />}
          {tab === 'listing' && <ListingTab vendor={vendor} />}
          {tab === 'prices' && <PricesTab vendor={vendor} />}
          {tab === 'photos' && <PhotosTab vendor={vendor} />}
          {tab === 'availability' && <DatesTab vendor={vendor} />}
          {tab === 'questions' && (
            <div>
              <h2 className="display-s">{vendor.category === 'cake' ? 'Cake questions' : 'Photography questions'}</h2>
              <p className="muted dash__intro">
                {vendor.hasApplication
                  ? 'You’ve answered these. Send them again only if something changed — our team sees the latest.'
                  : 'Our team checks these before your listing goes live. They’re the same questions every vendor answers.'}
              </p>
              <VendorForm
                verifyMode={verifyMode}
                account={{
                  name: vendor.name,
                  businessName: vendor.businessName,
                  phone: vendor.phone,
                  vendorType: vendor.category as 'photography' | 'cake',
                  area: vendor.areas.find((a) => a !== 'All over Chennai') ?? vendor.areas[0] ?? '',
                }}
                onDone={() => window.setTimeout(() => window.location.reload(), 1800)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ListingPill({ status }: { status: ListingStatus }) {
  const label = LISTING_STATUSES.find(([v]) => v === status)?.[1] ?? status
  return <span className={`pill pill--listing-${status}`}>{label}</span>
}

/** What to do next: the checklist and "Send for review", or the live/paused switch. */
function StatusPanel({ vendor, onGo }: { vendor: DashboardVendor; onGo: (t: Tab) => void }) {
  const s = useSave(LOGIN)
  const gaps = listingGapList(vendor)
  const status = vendor.listingStatus

  if (status === 'pending') {
    return (
      <div className="dash__notice" role="status">
        <strong>Your listing is with our team.</strong> We usually review within 2 working days and may call you.
        You can keep editing meanwhile.
      </div>
    )
  }
  if (status === 'published' || status === 'paused') {
    return (
      <div className="dash__notice">
        {status === 'published' ? (
          <>
            <strong>You&apos;re live on the marketplace.</strong> Keep your dates and prices current so couples who
            call can book you.
          </>
        ) : (
          <>
            <strong>Your listing is paused</strong> — couples can&apos;t see it.
          </>
        )}{' '}
        <button
          type="button"
          className="btn btn--ghost btn--small"
          disabled={s.busy}
          onClick={() => s.run(() => setPaused(status === 'published'))}
        >
          {status === 'published' ? 'Pause listing' : 'Go live again'}
        </button>
        {s.error && <p className="form__error">{s.error}</p>}
      </div>
    )
  }
  return (
    <div className={`dash__notice ${status === 'rejected' ? 'dash__notice--warn' : ''}`}>
      {status === 'rejected' && vendor.reviewNote && (
        <p>
          <strong>From our team:</strong> {vendor.reviewNote}
        </p>
      )}
      {gaps.length ? (
        <>
          <strong>To go live, finish these:</strong>
          <ul className="dash__checklist">
            {gaps.map((g) => (
              <li key={g.text}>
                <button type="button" className="link-btn" onClick={() => onGo(g.tab)}>
                  {g.text}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <strong>Your listing is ready.</strong> Send it to our team — we&apos;ll check it and put it live.{' '}
          <button
            type="button"
            className="btn btn--gold btn--small"
            disabled={s.busy}
            onClick={() => s.run(submitForReview)}
          >
            {s.busy ? 'Sending…' : 'Send for review'}
          </button>
        </>
      )}
      {s.error && <p className="form__error">{s.error}</p>}
    </div>
  )
}

// ---------- enquiries ----------

function EnquiriesTab({ enquiries, live }: { enquiries: VendorEnquiry[]; live: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState<number | null>(enquiries.find((e) => e.unread)?.id ?? null)
  const s = useSave(LOGIN)

  if (!enquiries.length) {
    return (
      <div className="dash__empty">
        <h2 className="display-s">No enquiries yet</h2>
        <p className="muted">
          {live
            ? 'Couples who like your listing will message you here, with their date, guests and budget. We email you when one arrives.'
            : 'Once your listing is live, couples can send you enquiries from it.'}
        </p>
      </div>
    )
  }

  function toggle(e: VendorEnquiry) {
    setOpen(open === e.id ? null : e.id)
    if (e.unread) void markEnquiryRead(e.id).then(() => router.refresh())
  }

  return (
    <ul className="enq-list">
      {enquiries.map((e) => (
        <li key={e.id} className={`enq ${e.unread ? 'is-unread' : ''}`}>
          <button type="button" className="enq__head" onClick={() => toggle(e)} aria-expanded={open === e.id}>
            <span className="enq__name">
              {e.unread && <span className="enq__dot" aria-label="New" />}
              {e.customer.name}
            </span>
            <span className="enq__sub muted">
              {e.eventDate ? formatDay(e.eventDate) : 'Date not fixed'} · {e.guests ? `${e.guests} guests` : 'guests ?'}
            </span>
            <StatusPill status={e.status} />
          </button>
          {open === e.id && (
            <div className="enq__body">
              <EnquiryFacts e={e} />
              <p className="enq__contact">
                <a className="btn btn--whatsapp btn--small" href={`https://wa.me/91${e.customer.phone}`} target="_blank" rel="noopener">
                  WhatsApp {e.customer.phone}
                </a>
                <a className="btn btn--ghost btn--small" href={`tel:+91${e.customer.phone}`}>
                  Call
                </a>
              </p>
              <EnquiryThread
                enquiry={e}
                side="vendor"
                otherName={e.customer.name}
                closed={e.status === 'closed' || e.status === 'declined'}
                onReply={async (text, quote) => {
                  const res = await s.run(() => replyToEnquiry({ id: e.id, text, quote }))
                  return Boolean(res?.ok)
                }}
              />
              <div className="enq__actions">
                {e.status !== 'booked' && (
                  <button type="button" className="btn btn--gold btn--small" disabled={s.busy} onClick={() => s.run(() => setEnquiryStatus({ id: e.id, status: 'booked' }))}>
                    Mark booked{e.eventDate ? ' (blocks the date)' : ''}
                  </button>
                )}
                {e.status !== 'declined' && e.status !== 'booked' && (
                  <button type="button" className="btn btn--ghost btn--small" disabled={s.busy} onClick={() => s.run(() => setEnquiryStatus({ id: e.id, status: 'declined' }))}>
                    Decline
                  </button>
                )}
                {(e.status === 'declined' || e.status === 'closed') && (
                  <button type="button" className="btn btn--ghost btn--small" disabled={s.busy} onClick={() => s.run(() => setEnquiryStatus({ id: e.id, status: 'replied' }))}>
                    Reopen
                  </button>
                )}
              </div>
              {s.error && <p className="form__error">{s.error}</p>}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

// ---------- listing ----------

function ListingTab({ vendor }: { vendor: DashboardVendor }) {
  const s = useSave(LOGIN)
  const [category, setCategory] = useState(vendor.category)
  const [areas, setAreas] = useState<string[]>(vendor.areas)
  const [about, setAbout] = useState(vendor.about)
  const allChennai = areas.includes('All over Chennai')

  function toggleArea(a: string) {
    setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await s.run(() =>
      saveListing({
        name: String(fd.get('name') ?? ''),
        phone: String(fd.get('phone') ?? ''),
        businessName: String(fd.get('businessName') ?? ''),
        category,
        otherService: String(fd.get('otherService') ?? ''),
        areas,
        about,
        instagram: String(fd.get('instagram') ?? ''),
        languages: fd.getAll('languages').map(String),
      }),
    )
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h2 className="display-s">Your listing</h2>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Business name *</span>
          <input name="businessName" defaultValue={vendor.businessName} required />
        </label>
        <label className="field">
          <span className="field__label">What you offer *</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {MARKET_CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {category === 'other' && (
        <label className="field">
          <span className="field__label">Which service? *</span>
          <input name="otherService" defaultValue={vendor.otherService} required />
        </label>
      )}
      <label className="field">
        <span className="field__label">About your work *</span>
        <textarea
          rows={6}
          value={about}
          maxLength={3000}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Your style, experience, what's included, how far you travel, how many events a day you take…"
        />
        <span className="field__hint">{about.trim().length} characters · couples read this first.</span>
      </label>

      <fieldset className="field choice">
        <legend className="field__label">Areas you serve *</legend>
        <label className="choice__option">
          <input type="checkbox" checked={allChennai} onChange={() => toggleArea('All over Chennai')} />
          <span>
            <strong>All over Chennai</strong>
          </span>
        </label>
        {!allChennai && (
          <div className="area-grid">
            {MARKET_AREAS.filter((a) => a !== 'All over Chennai').map((a) => (
              <label key={a} className="choice__option">
                <input type="checkbox" checked={areas.includes(a)} onChange={() => toggleArea(a)} />
                <span>{a}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="field choice">
        <legend className="field__label">Languages you speak</legend>
        <div className="choice--inline">
          {LANGUAGES.map((l) => (
            <label key={l} className="choice__option">
              <input type="checkbox" name="languages" value={l.toLowerCase()} defaultChecked={vendor.languages.includes(l.toLowerCase())} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field__label">Instagram / website</span>
        <input name="instagram" defaultValue={vendor.instagram} placeholder="@yourstudio or https://…" />
      </label>

      <div className="form__row">
        <label className="field">
          <span className="field__label">Contact name *</span>
          <input name="name" defaultValue={vendor.name} required />
        </label>
        <label className="field">
          <span className="field__label">Phone *</span>
          <input name="phone" defaultValue={vendor.phone} required inputMode="tel" />
          <span className="field__hint">
            {vendor.phoneVerified ? '✓ Verified on WhatsApp. ' : ''}Couples see it only after you reply to them.
          </span>
        </label>
      </div>

      <SaveBar s={s} label="Save listing" />
    </form>
  )
}

function SaveBar({ s, label }: { s: ReturnType<typeof useSave>; label: string }) {
  return (
    <div className="dash__save">
      <button className="btn btn--primary" type="submit" disabled={s.busy}>
        {s.busy ? 'Saving…' : label}
      </button>
      <span className={s.error ? 'form__error' : 'dash__saved'} role="status">
        {statusText(s)}
      </span>
    </div>
  )
}

// ---------- prices ----------

type Row = { item: string; unit: string; price: string; gstIncluded: boolean; note: string }

const SUGGESTED: Record<string, string[]> = {
  photography: ['Candid photography', 'Traditional photo + video', 'Wedding film', 'Album (40 sheets)'],
  makeup: ['Bridal makeup (HD)', 'Reception makeup', 'Family member makeup', 'Saree draping'],
  mehendi: ['Bridal mehendi (both hands & feet)', 'Guest mehendi'],
  decoration: ['Stage decoration', 'Entrance decoration', 'Car decoration'],
  catering: ['Veg lunch (banana leaf)', 'Non-veg dinner buffet', 'Live counter'],
  cake: ['Chocolate cake', 'Theme cake'],
  venue: ['Hall rent (full day)', 'Hall rent (half day)', 'Dining hall'],
  dj: ['DJ with sound & lights (4 hours)', 'Nadaswaram & thavil'],
  invitations: ['Printed invite (per card)', 'Digital video invite'],
}

function PricesTab({ vendor }: { vendor: DashboardVendor }) {
  const s = useSave(LOGIN)
  const [rows, setRows] = useState<Row[]>(
    vendor.priceCard.length
      ? vendor.priceCard.map((r) => ({ ...r, price: String(r.price) }))
      : [{ item: '', unit: 'event', price: '', gstIncluded: true, note: '' }],
  )
  const set = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const suggestions = (SUGGESTED[vendor.category] ?? []).filter((x) => !rows.some((r) => r.item === x))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await s.run(() => savePrices(rows))
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h2 className="display-s">Price card</h2>
      <p className="muted dash__intro">
        Show real, all-in prices. Couples trust vendors who don&apos;t hide prices — and the ones who call can afford you.
        Tick &ldquo;GST included&rdquo; when the price already has GST in it.
      </p>
      <div className="price-rows">
        {rows.map((r, i) => (
          <div key={i} className="price-row">
            <label className="field price-row__item">
              <span className="field__label">What</span>
              <input value={r.item} onChange={(e) => set(i, { item: e.target.value })} placeholder="e.g. Candid photography" maxLength={80} />
            </label>
            <label className="field price-row__price">
              <span className="field__label">Price (₹)</span>
              <input type="number" min={0} inputMode="numeric" value={r.price} onChange={(e) => set(i, { price: e.target.value })} />
            </label>
            <label className="field price-row__unit">
              <span className="field__label">Charged</span>
              <select value={r.unit} onChange={(e) => set(i, { unit: e.target.value })}>
                {PRICE_UNITS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field price-row__note">
              <span className="field__label">Includes (optional)</span>
              <input value={r.note} onChange={(e) => set(i, { note: e.target.value })} placeholder="e.g. what’s included, hours, people" maxLength={140} />
            </label>
            <label className="choice__option price-row__gst">
              <input type="checkbox" checked={r.gstIncluded} onChange={(e) => set(i, { gstIncluded: e.target.checked })} />
              <span>GST included</span>
            </label>
            <button type="button" className="link-btn price-row__remove" onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove ${r.item || 'this price'}`}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="btn-row">
        {rows.length < 25 && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setRows((cur) => [...cur, { item: '', unit: 'event', price: '', gstIncluded: true, note: '' }])}>
            + Add a price
          </button>
        )}
        {suggestions.slice(0, 3).map((x) => (
          <button key={x} type="button" className="chip" onClick={() => setRows((cur) => [...cur.filter((r) => r.item || r.price), { item: x, unit: vendor.category === 'catering' ? 'plate' : vendor.category === 'cake' ? 'kg' : 'event', price: '', gstIncluded: true, note: '' }])}>
            + {x}
          </button>
        ))}
      </div>
      <SaveBar s={s} label="Save prices" />
    </form>
  )
}

// ---------- photos ----------

function PhotosTab({ vendor }: { vendor: DashboardVendor }) {
  const router = useRouter()
  const s = useSave(LOGIN)
  const [gallery, setGallery] = useState<PublicPhoto[]>(vendor.gallery)
  const [spare, setSpare] = useState<PublicPhoto[]>(vendor.spare)
  const [coverId, setCoverId] = useState<number | null>(vendor.coverId ?? vendor.gallery[0]?.id ?? null)
  const [uploading, setUploading] = useState(0)

  async function persist(next: PublicPhoto[], cover: number | null) {
    setGallery(next)
    setCoverId(cover)
    await s.run(() => saveGallery({ ids: next.map((p) => p.id), coverId: cover }))
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    s.setError('')
    const added: PublicPhoto[] = []
    for (const file of Array.from(files).slice(0, 10)) {
      if (file.size > 4 * 1024 * 1024) {
        s.setError(`${file.name} is larger than 4 MB — please resize it.`)
        continue
      }
      setUploading((n) => n + 1)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('_payload', JSON.stringify({ alt: vendor.businessName }))
        const res = await fetch('/api/vendor-media', { method: 'POST', body: fd, credentials: 'same-origin' })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.errors?.[0]?.message || 'Upload failed.')
        const d = body.doc
        const url = (u?: string) => (u ? u.replace(/^https?:\/\/[^/]+(?=\/api\/)/, '') : '')
        added.push({
          id: d.id,
          url: url(d.sizes?.feature?.url) || url(d.url),
          card: url(d.sizes?.card?.url) || url(d.url),
          thumb: url(d.sizes?.thumbnail?.url) || url(d.url),
          alt: d.alt || '',
        })
      } catch (err) {
        s.setError(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (added.length) {
      const next = [...gallery, ...added].slice(0, 30)
      await persist(next, coverId ?? next[0]?.id ?? null)
    }
  }

  function move(i: number, d: -1 | 1) {
    const j = i + d
    if (j < 0 || j >= gallery.length) return
    const next = [...gallery]
    ;[next[i], next[j]] = [next[j], next[i]]
    void persist(next, coverId)
  }

  async function remove(p: PublicPhoto) {
    if (!window.confirm('Delete this photo?')) return
    const res = await s.run(() => deletePhoto(p.id))
    if (res?.ok) {
      setGallery((g) => g.filter((x) => x.id !== p.id))
      setSpare((g) => g.filter((x) => x.id !== p.id))
      router.refresh()
    }
  }

  return (
    <div>
      <h2 className="display-s">Photos</h2>
      <p className="muted dash__intro">
        Upload at least 3 photos of your own work (JPG, PNG or WebP, up to 4 MB each). The cover photo shows on
        search results. Use the arrows to change the order.
      </p>
      <label className="upload-drop">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { void upload(e.target.files); e.target.value = '' }} />
        <span className="btn btn--primary">{uploading ? `Uploading ${uploading}…` : 'Upload photos'}</span>
        <span className="field__hint">{gallery.length} / 30 on your listing</span>
      </label>
      {(s.error || s.saved) && (
        <p className={s.error ? 'form__error' : 'dash__saved'} role="status">
          {statusText(s)}
        </p>
      )}
      <ul className="photo-grid">
        {gallery.map((p, i) => (
          <li key={p.id} className={`photo-tile ${coverId === p.id ? 'is-cover' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt="" loading="lazy" width={400} height={400} />
            {coverId === p.id && <span className="photo-tile__badge">Cover</span>}
            <div className="photo-tile__tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">‹</button>
              {coverId !== p.id && (
                <button type="button" onClick={() => persist(gallery, p.id)} aria-label="Make this the cover photo">★ Cover</button>
              )}
              <button type="button" onClick={() => remove(p)} aria-label="Delete photo">✕</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === gallery.length - 1} aria-label="Move later">›</button>
            </div>
          </li>
        ))}
      </ul>
      {spare.length > 0 && (
        <>
          <p className="field__label">Uploaded but not on your listing</p>
          <ul className="photo-grid photo-grid--spare">
            {spare.map((p) => (
              <li key={p.id} className="photo-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" loading="lazy" width={400} height={400} />
                <div className="photo-tile__tools">
                  <button type="button" onClick={() => { setSpare((g) => g.filter((x) => x.id !== p.id)); void persist([...gallery, p], coverId ?? p.id) }}>Add</button>
                  <button type="button" onClick={() => remove(p)} aria-label="Delete photo">✕</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// ---------- dates ----------

function DatesTab({ vendor }: { vendor: DashboardVendor }) {
  const s = useSave(LOGIN)
  const [rows, setRows] = useState(vendor.blockedDates)
  const blocked = useMemo(() => new Set(rows.map((r) => r.date)), [rows])

  async function toggle(day: string) {
    const next = blocked.has(day) ? rows.filter((r) => r.date !== day) : [...rows, { date: day, note: '' }].sort((a, b) => a.date.localeCompare(b.date))
    setRows(next)
    await s.run(() => saveBlockedDates(next))
  }

  const upcoming = rows.filter((r) => r.date >= new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))

  return (
    <div>
      <h2 className="display-s">Booked dates</h2>
      <p className="muted dash__intro">
        Tap a day to mark it booked or unavailable — couples searching that date won&apos;t see you, and your listing
        shows it. Tap again to free it. Saved instantly.
      </p>
      <MonthCalendar blocked={blocked} onToggle={toggle} months={2} />
      <p className={s.error ? 'form__error' : 'dash__saved'} role="status">
        {statusText(s)}
      </p>
      {upcoming.length > 0 && (
        <ul className="dates-list">
          {upcoming.map((r) => (
            <li key={r.date}>
              <strong>{formatDay(`${r.date}T12:00:00+05:30`)}</strong>
              {r.note && <span className="muted"> · {r.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
