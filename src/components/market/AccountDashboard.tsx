'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { closeEnquiry, handToZenfest, markRead, replyAsCustomer, updateProfile } from '../../app/(frontend)/account/actions'
import { logOut } from '../../lib/authActions'
import type { CustomerEnquiry, PublicVendor } from '../../lib/marketplace'
import { MARKET_AREAS } from '../../lib/marketplaceOptions'
import { EnquiryFacts, EnquiryThread, StatusPill, formatDay } from './EnquiryThread'
import { VendorCard } from './VendorCard'
import { statusText, useSave } from './useSave'

type Profile = {
  name: string
  email: string
  phone: string
  phoneVerified: boolean
  city: string
  eventDate: string
}

type Tab = 'enquiries' | 'shortlist' | 'planner' | 'profile'

export function AccountDashboard({
  profile,
  enquiries,
  shortlist,
  initialTab,
  sentTo,
}: {
  profile: Profile
  enquiries: CustomerEnquiry[]
  shortlist: PublicVendor[]
  initialTab: string
  sentTo: string
}) {
  const tabs: [Tab, string][] = [
    ['enquiries', 'My enquiries'],
    ['shortlist', 'Shortlist'],
    ['planner', 'Plan with Zenfest'],
    ['profile', 'Profile'],
  ]
  const fallback: Tab = enquiries.length ? 'enquiries' : 'shortlist'
  const [tab, setTab] = useState<Tab>(tabs.some(([t]) => t === initialTab) ? (initialTab as Tab) : fallback)
  const unread = enquiries.filter((e) => e.unread).length

  function go(t: Tab) {
    setTab(t)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    url.searchParams.delete('sent')
    window.history.replaceState(null, '', url)
  }

  return (
    <section className="section section--tight dash">
      <div className="container">
        <div className="dash__head">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="display-m">Hi, {profile.name.split(' ')[0]}</h1>
            <p className="muted dash__meta">{profile.email}</p>
          </div>
          <div className="dash__head-actions">
            <Link className="btn btn--gold" href="/marketplace">
              Find vendors
            </Link>
            <form action={logOut}>
              <button className="btn btn--ghost" type="submit">
                Log out
              </button>
            </form>
          </div>
        </div>

        {sentTo && (
          <div className="dash__notice dash__notice--gold" role="status">
            <strong>Enquiry sent to {sentTo}.</strong> We&apos;ve emailed them. Their reply — and their phone number —
            will show up here.
          </div>
        )}

        <div className="reg-tabs reg-tabs--dash" role="tablist">
          {tabs.map(([t, label]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`reg-tab ${tab === t ? 'is-active' : ''}`} onClick={() => go(t)}>
              {label}
              {t === 'enquiries' && unread > 0 && <span className="dash__badge">{unread}</span>}
              {t === 'shortlist' && shortlist.length > 0 && <span className="dash__count">{shortlist.length}</span>}
            </button>
          ))}
        </div>

        <div className="dash__panel card">
          {tab === 'enquiries' && <EnquiriesTab enquiries={enquiries} />}
          {tab === 'shortlist' && <ShortlistTab shortlist={shortlist} />}
          {tab === 'planner' && <PlannerTab shortlistCount={shortlist.length} enquiryCount={enquiries.length} />}
          {tab === 'profile' && <ProfileTab profile={profile} />}
        </div>
      </div>
    </section>
  )
}

function EnquiriesTab({ enquiries }: { enquiries: CustomerEnquiry[] }) {
  const router = useRouter()
  const s = useSave()
  const [open, setOpen] = useState<number | null>(enquiries.find((e) => e.unread)?.id ?? enquiries[0]?.id ?? null)

  if (!enquiries.length) {
    return (
      <div className="dash__empty">
        <h2 className="display-s">No enquiries yet</h2>
        <p className="muted">Find a vendor you like and tap &ldquo;Request a quote&rdquo;. Every conversation stays here.</p>
        <Link className="btn btn--primary" href="/marketplace">
          Browse the marketplace
        </Link>
      </div>
    )
  }

  function toggle(e: CustomerEnquiry) {
    setOpen(open === e.id ? null : e.id)
    if (e.unread) void markRead(e.id).then(() => router.refresh())
  }

  return (
    <ul className="enq-list">
      {enquiries.map((e) => (
        <li key={e.id} className={`enq ${e.unread ? 'is-unread' : ''}`}>
          <button type="button" className="enq__head" onClick={() => toggle(e)} aria-expanded={open === e.id}>
            <span className="enq__name">
              {e.unread && <span className="enq__dot" aria-label="New reply" />}
              {e.vendor.businessName}
            </span>
            <span className="enq__sub muted">
              {e.vendor.service} · {e.eventDate ? formatDay(e.eventDate) : 'date not fixed'}
            </span>
            <StatusPill status={e.status} />
          </button>
          {open === e.id && (
            <div className="enq__body">
              <EnquiryFacts e={e} />
              {e.vendorContact ? (
                <p className="enq__contact">
                  <a className="btn btn--whatsapp btn--small" href={`https://wa.me/91${e.vendorContact.phone}`} target="_blank" rel="noopener">
                    WhatsApp {e.vendorContact.phone}
                  </a>
                  <a className="btn btn--ghost btn--small" href={`tel:+91${e.vendorContact.phone}`}>
                    Call
                  </a>
                  {e.vendor.live && (
                    <Link className="btn btn--ghost btn--small" href={`/marketplace/v/${e.vendor.slug}`}>
                      View listing
                    </Link>
                  )}
                </p>
              ) : (
                <p className="field__hint">The vendor&apos;s number appears here once they reply.</p>
              )}
              <EnquiryThread
                enquiry={e}
                side="customer"
                otherName={e.vendor.businessName}
                closed={e.status === 'closed' || e.status === 'declined'}
                onReply={async (text) => {
                  const res = await s.run(() => replyAsCustomer({ id: e.id, text }))
                  return Boolean(res?.ok)
                }}
              />
              {e.status !== 'closed' && e.status !== 'declined' && (
                <div className="enq__actions">
                  <button type="button" className="btn btn--ghost btn--small" disabled={s.busy} onClick={() => s.run(() => closeEnquiry(e.id))}>
                    I&apos;m not going ahead — close
                  </button>
                </div>
              )}
              {s.error && <p className="form__error">{s.error}</p>}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function ShortlistTab({ shortlist }: { shortlist: PublicVendor[] }) {
  if (!shortlist.length) {
    return (
      <div className="dash__empty">
        <h2 className="display-s">Your shortlist is empty</h2>
        <p className="muted">Tap the ♡ on any vendor to save them here and compare later.</p>
        <Link className="btn btn--primary" href="/marketplace">
          Browse the marketplace
        </Link>
      </div>
    )
  }
  return (
    <div className="mk-grid">
      {shortlist.map((v) => (
        <VendorCard key={v.id} vendor={v} shortlisted />
      ))}
    </div>
  )
}

function PlannerTab({ shortlistCount, enquiryCount }: { shortlistCount: number; enquiryCount: number }) {
  const s = useSave()
  const [done, setDone] = useState(false)
  if (done) {
    return (
      <div className="form-success" role="status">
        <h2 className="display-m">Our team has it</h2>
        <p className="muted">A Zenfest planner will call you, usually within a working day, with your shortlist in hand.</p>
      </div>
    )
  }
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        const note = String(new FormData(e.currentTarget).get('note') ?? '')
        const res = await s.run(() => handToZenfest({ note }))
        if (res?.ok) setDone(true)
      }}
    >
      <h2 className="display-s">Rather have us plan it?</h2>
      <p className="muted dash__intro">
        Doing it yourself is great — until it isn&apos;t. Hand your plan to Zenfest and our planners take over: we
        call you, use your shortlist ({shortlistCount} saved, {enquiryCount} enquiries), negotiate with vendors and
        run the day.
      </p>
      <label className="field">
        <span className="field__label">Anything we should know? (optional)</span>
        <textarea name="note" rows={3} maxLength={2000} placeholder="e.g. Budget ₹6 lakh all-in, reception in Tambaram, need help with decor and catering" />
      </label>
      <div className="dash__save">
        <button className="btn btn--gold" type="submit" disabled={s.busy}>
          {s.busy ? 'Sending…' : 'Ask a Zenfest planner to call me'}
        </button>
        {s.error && <span className="form__error">{s.error}</span>}
      </div>
    </form>
  )
}

function ProfileTab({ profile }: { profile: Profile }) {
  const s = useSave()
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        await s.run(() =>
          updateProfile({
            name: String(fd.get('name') ?? ''),
            phone: String(fd.get('phone') ?? ''),
            city: String(fd.get('city') ?? ''),
            eventDate: String(fd.get('eventDate') ?? ''),
          }),
        )
      }}
    >
      <h2 className="display-s">Profile</h2>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Name *</span>
          <input name="name" defaultValue={profile.name} required />
        </label>
        <label className="field">
          <span className="field__label">Phone *</span>
          <input name="phone" defaultValue={profile.phone} required inputMode="tel" />
          <span className="field__hint">
            {profile.phoneVerified ? '✓ Verified on WhatsApp. ' : ''}Shared with a vendor only when you send them an enquiry.
          </span>
        </label>
      </div>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Area / city</span>
          <input name="city" defaultValue={profile.city} list="profile-areas" />
          <datalist id="profile-areas">
            {MARKET_AREAS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span className="field__label">Event date</span>
          <input name="eventDate" type="date" defaultValue={profile.eventDate} />
        </label>
      </div>
      <p className="field__hint">
        Email: {profile.email}. To change your password, <Link href="/account/forgot-password">reset it by email</Link>.
      </p>
      <div className="dash__save">
        <button className="btn btn--primary" type="submit" disabled={s.busy}>
          {s.busy ? 'Saving…' : 'Save profile'}
        </button>
        <span className={s.error ? 'form__error' : 'dash__saved'} role="status">
          {statusText(s)}
        </span>
      </div>
    </form>
  )
}
