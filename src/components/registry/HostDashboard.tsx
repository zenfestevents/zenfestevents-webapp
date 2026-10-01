'use client'

import React, { useEffect, useState, useTransition } from 'react'

import { updateEventSettings } from '../../app/(frontend)/registry/actions'
import type { HostRegistry } from '../../lib/registry'
import { whatsappLink } from '../../lib/site'
import { HostGifts } from './HostGifts'
import { HostGuests } from './HostGuests'
import { HostPolls } from './HostPolls'
import { QrCode } from './QrCode'
import { useOrigin } from './useClient'

type Tab = 'gifts' | 'guests' | 'polls' | 'share' | 'settings' | 'return-gifts'

const TABS: [Tab, string][] = [
  ['gifts', 'Gifts'],
  ['guests', 'Guests & RSVP'],
  ['polls', 'Polls'],
  ['share', 'Share'],
  ['settings', 'Details'],
  ['return-gifts', 'Return gifts'],
]

/** Host dashboard shell. The manage key travels with every action call. */
export function HostDashboard({
  data,
  manageKey,
  isNew,
  zenfestWhatsapp,
}: {
  data: HostRegistry
  manageKey: string
  isNew: boolean
  zenfestWhatsapp?: string
}) {
  const { event } = data
  const auth = { slug: event.slug, manageKey }
  const [tab, setTab] = useState<Tab>('gifts')
  const origin = useOrigin()
  const [welcome, setWelcome] = useState(isNew)

  // Take `new=1` out of the address bar so a reload doesn't show the welcome again.
  useEffect(() => {
    if (!isNew) return
    const url = new URL(window.location.href)
    url.searchParams.delete('new')
    window.history.replaceState(null, '', url)
  }, [isNew])

  const registryUrl = `${origin}/r/${event.slug}`
  const manageUrl = `${origin}/dashboard/${event.slug}?key=${encodeURIComponent(manageKey)}`

  return (
    <div className="reg-dash">
      {welcome && (
        <div className="reg-welcome card" role="status">
          <h2 className="reg-section-title">Your registry is live 🎉</h2>
          <p>
            <strong>Save your private manage link</strong> — it’s the only way back to this page. Anyone with it can
            edit your registry, so don’t share it with guests.
          </p>
          <ManageLinkTools manageUrl={manageUrl} hostPhone={event.hostPhone} />
          <button type="button" className="reg-link" onClick={() => setWelcome(false)}>
            I’ve saved it
          </button>
        </div>
      )}

      <nav className="reg-tabs reg-tabs--dash" role="tablist" aria-label="Dashboard">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`reg-tab ${tab === t ? 'is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'gifts' && <HostGifts auth={auth} data={data} />}
      {tab === 'guests' && <HostGuests auth={auth} data={data} registryUrl={registryUrl} />}
      {tab === 'polls' && <HostPolls auth={auth} data={data} />}
      {tab === 'share' && <SharePanel registryUrl={registryUrl} manageUrl={manageUrl} data={data} />}
      {tab === 'settings' && <SettingsPanel auth={auth} data={data} />}
      {tab === 'return-gifts' && (
        <div className="reg-soon card">
          <p className="eyebrow">Coming soon</p>
          <h2 className="reg-section-title">Return gifts, delivered to your venue</h2>
          <p className="muted">
            German silver bowls, Meenakari boxes, brass diyas, jute bags and more — personalised with your names
            and date, at bulk prices for 50 to 500 guests.
          </p>
          <a
            className="btn btn--whatsapp"
            href={whatsappLink(
              zenfestWhatsapp,
              `Hi Zenfest, I'd like return gift options for ${event.title} (registry: ${event.slug}).`,
            )}
            target="_blank"
            rel="noopener"
          >
            Ask us on WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          prompt('Copy this link:', text)
        }
      }}
    >
      {copied ? 'Copied ✓' : label}
    </button>
  )
}

function ManageLinkTools({ manageUrl, hostPhone }: { manageUrl: string; hostPhone?: string | null }) {
  const digits = (hostPhone || '').replace(/\D/g, '')
  const self = digits.length === 10 ? `91${digits}` : digits
  return (
    <div className="btn-row">
      <CopyButton text={manageUrl} label="Copy manage link" />
      {self && (
        <a
          className="btn btn--whatsapp"
          href={whatsappLink(self, `My Zenfest registry manage link (keep private):\n${manageUrl}`)}
          target="_blank"
          rel="noopener"
        >
          Send to my WhatsApp
        </a>
      )}
    </div>
  )
}

function SharePanel({ registryUrl, manageUrl, data }: { registryUrl: string; manageUrl: string; data: HostRegistry }) {
  const message =
    `You're invited to ${data.event.title}! 🎉\n` +
    `Date, venue and our gift wishlist: ${registryUrl}`
  return (
    <div className="reg-share">
      <div className="card reg-share__card">
        <h2 className="reg-section-title">Share with guests</h2>
        <p className="reg-share__url">{registryUrl}</p>
        <div className="btn-row">
          <a className="btn btn--whatsapp" href={whatsappLink('', message)} target="_blank" rel="noopener">
            Share on WhatsApp
          </a>
          <CopyButton text={registryUrl} label="Copy link" />
          <a className="btn btn--ghost" href={registryUrl} target="_blank" rel="noopener">
            View as a guest
          </a>
        </div>
        <div className="reg-share__qr">
          {registryUrl.startsWith('http') && <QrCode value={registryUrl} label="QR code for your registry" />}
          <span className="field__hint">Print this on your invitation card.</span>
        </div>
      </div>
      <div className="card reg-share__card reg-share__card--private">
        <h2 className="reg-section-title">Your private manage link</h2>
        <p className="muted">Only for you and family who help manage the registry. Don’t send it to guests.</p>
        <ManageLinkTools manageUrl={manageUrl} hostPhone={data.event.hostPhone} />
      </div>
    </div>
  )
}

function toLocalParts(iso: string) {
  const ist = new Date(new Date(iso).getTime() + 330 * 60_000).toISOString()
  return { date: ist.slice(0, 10), time: ist.slice(11, 16) }
}

function SettingsPanel({ auth, data }: { auth: { slug: string; manageKey: string }; data: HostRegistry }) {
  const e = data.event
  const initial = toLocalParts(e.eventDate)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    const g = (k: string) => String(fd.get(k) ?? '')
    setMsg(null)
    start(async () => {
      const res = await updateEventSettings(auth.slug, auth.manageKey, {
        title: g('title'),
        hostNames: g('hostNames'),
        eventDate: new Date(`${g('date')}T${g('time') || '00:00'}:00+05:30`).toISOString(),
        venueName: g('venueName'),
        venueCity: g('venueCity'),
        venueMapUrl: g('venueMapUrl'),
        welcomeNote: g('welcomeNote'),
        hostEmail: g('hostEmail'),
        upiId: g('upiId'),
        upiName: g('upiName'),
      })
      setMsg(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: res.error })
    })
  }

  return (
    <form className="form card reg-add" onSubmit={submit}>
      <h2 className="reg-section-title">Event details</h2>
      <label className="field">
        <span className="field__label">Registry title *</span>
        <input name="title" required maxLength={120} defaultValue={e.title} />
      </label>
      <label className="field">
        <span className="field__label">Names shown to guests</span>
        <input name="hostNames" maxLength={120} defaultValue={e.hostNames || ''} />
      </label>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Date *</span>
          <input name="date" type="date" required defaultValue={initial.date} />
        </label>
        <label className="field">
          <span className="field__label">Time</span>
          <input name="time" type="time" defaultValue={initial.time === '00:00' ? '' : initial.time} />
        </label>
      </div>
      <div className="form__row">
        <label className="field">
          <span className="field__label">Venue</span>
          <input name="venueName" maxLength={160} defaultValue={e.venueName || ''} />
        </label>
        <label className="field">
          <span className="field__label">City</span>
          <input name="venueCity" maxLength={80} defaultValue={e.venueCity || ''} />
        </label>
      </div>
      <label className="field">
        <span className="field__label">Google Maps link</span>
        <input name="venueMapUrl" type="url" defaultValue={e.venueMapUrl || ''} />
      </label>
      <label className="field">
        <span className="field__label">Note to guests</span>
        <textarea name="welcomeNote" rows={3} maxLength={800} defaultValue={e.welcomeNote || ''} />
      </label>
      <label className="field">
        <span className="field__label">Your email</span>
        <input name="hostEmail" type="email" defaultValue={e.hostEmail} />
      </label>

      <fieldset className="form__section">
        <legend className="form__section-title">Shagun by UPI</legend>
        <p className="field__hint">
          Guests scan a QR or tap to pay straight into this account. Zenfest never touches the money and charges
          nothing.
        </p>
        <div className="form__row">
          <label className="field">
            <span className="field__label">UPI ID</span>
            <input name="upiId" maxLength={80} placeholder="name@okhdfcbank" defaultValue={e.upiId || ''} />
          </label>
          <label className="field">
            <span className="field__label">Name on the account</span>
            <input name="upiName" maxLength={120} defaultValue={e.upiName || ''} />
          </label>
        </div>
      </fieldset>

      {msg && <p className={msg.ok ? 'field__hint' : 'form__error'}>{msg.text}</p>}
      <button className="btn btn--primary form__submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save details'}
      </button>
    </form>
  )
}
