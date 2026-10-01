'use client'

import React, { useState, useTransition } from 'react'

import { addGuests, deleteGuest, updateGuest } from '../../app/(frontend)/registry/actions'
import type { HostGuest, HostRegistry } from '../../lib/registry'
import { GUEST_SIDES, RSVP_OPTIONS } from '../../lib/registryOptions'
import { whatsappLink } from '../../lib/site'

type Auth = { slug: string; manageKey: string }

/** "Name, phone" per line → rows. Accepts tabs too (pasted from a spreadsheet). */
function parseList(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/[,\t]/).map((s) => s.trim()))
    .filter(([name]) => name)
    .map(([name, phone = '', count = '']) => ({ name, phone, count: Number(count) || 1 }))
}

const waNumber = (phone?: string | null) => {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return ''
  return d.length === 10 ? `91${d}` : d
}

/** Guest list & RSVP tab, with one-tap WhatsApp invites carrying the registry link. */
export function HostGuests({ auth, data, registryUrl }: { auth: Auth; data: HostRegistry; registryUrl: string }) {
  const { guests, event } = data
  const [list, setList] = useState('')
  const [side, setSide] = useState('family')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  const sum = (rsvp: string) => guests.filter((g) => g.rsvp === rsvp).reduce((n, g) => n + (g.count || 1), 0)

  function add(e: React.FormEvent) {
    e.preventDefault()
    const rows = parseList(list).map((r) => ({ ...r, side }))
    if (!rows.length) return
    start(async () => {
      const res = await addGuests(auth.slug, auth.manageKey, rows)
      if (!res.ok) setMsg(res.error)
      else {
        setMsg(`Added ${res.added} guest${res.added === 1 ? '' : 's'}.`)
        setList('')
      }
    })
  }

  const inviteText = (g: HostGuest) =>
    `Dear ${g.name}, you're warmly invited to ${event.title}! 🎉\n\n` +
    `Date, venue and our gift registry are here: ${registryUrl}\n\n` +
    `Please reply YES / NO to let us know if you can come.`

  function setRsvp(g: HostGuest, rsvp: string) {
    start(async () => {
      const res = await updateGuest(auth.slug, auth.manageKey, g.id, { rsvp })
      if (!res.ok) alert(res.error)
    })
  }

  function markInvited(g: HostGuest) {
    start(async () => {
      await updateGuest(auth.slug, auth.manageKey, g.id, { invited: true })
    })
  }

  function remove(g: HostGuest) {
    if (!confirm(`Remove ${g.name} from your guest list?`)) return
    start(async () => {
      const res = await deleteGuest(auth.slug, auth.manageKey, g.id)
      if (!res.ok) alert(res.error)
    })
  }

  return (
    <div className="reg-host-guests">
      <div className="reg-rsvp-summary">
        {(
          [
            ['Invited', guests.length, 'guests'],
            ['Coming', sum('yes'), 'people'],
            ['Maybe', sum('maybe'), 'people'],
            ['Not coming', sum('no'), 'people'],
            ['No reply', guests.filter((g) => g.rsvp === 'pending').length, 'guests'],
          ] as [string, number, string][]
        ).map(([label, n, unit]) => (
          <div key={label} className="reg-rsvp-summary__cell card">
            <strong>{n}</strong>
            <span className="muted">
              {label} <small>({unit})</small>
            </span>
          </div>
        ))}
      </div>

      <form className="form reg-add card" onSubmit={add}>
        <h2 className="reg-section-title">Add guests</h2>
        <label className="field">
          <span className="field__label">One guest per line: name, phone, number of people</span>
          <textarea
            rows={4}
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder={'Lakshmi Aunty, 9876543210, 2\nArun & family, 9123456780, 4'}
          />
          <span className="field__hint">You can paste straight from a spreadsheet. Phone and count are optional.</span>
        </label>
        <div className="reg-linkbar__row">
          <select value={side} onChange={(e) => setSide(e.target.value)} aria-label="Group">
            {GUEST_SIDES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn btn--primary" disabled={pending || !list.trim()}>
            Add to list
          </button>
        </div>
        {msg && <p className="field__hint">{msg}</p>}
      </form>

      {guests.length > 0 && (
        <ul className="reg-list">
          {guests.map((g) => {
            const wa = waNumber(g.phone)
            return (
              <li key={g.id} className="reg-row reg-guest-row">
                <div className="reg-row__body">
                  <strong className="reg-row__title">
                    {g.name} {g.count && g.count > 1 ? <span className="muted">· {g.count}</span> : null}
                  </strong>
                  <span className="muted reg-row__meta">
                    {[g.phone, g.invitedAt ? 'Invite sent' : ''].filter(Boolean).join(' · ') || 'No phone'}
                  </span>
                </div>
                <div className="reg-row__actions">
                  <select
                    value={g.rsvp || 'pending'}
                    onChange={(e) => setRsvp(g, e.target.value)}
                    aria-label={`RSVP for ${g.name}`}
                    className={`reg-rsvp reg-rsvp--${g.rsvp || 'pending'}`}
                  >
                    {RSVP_OPTIONS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  {wa && (
                    <a
                      className="btn btn--whatsapp reg-row__wa"
                      href={whatsappLink(wa, inviteText(g))}
                      target="_blank"
                      rel="noopener"
                      onClick={() => markInvited(g)}
                    >
                      Invite
                    </a>
                  )}
                  <button type="button" className="reg-link reg-link--danger" onClick={() => remove(g)} disabled={pending}>
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
