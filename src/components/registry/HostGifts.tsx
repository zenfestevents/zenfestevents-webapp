'use client'

import Link from 'next/link'
import React, { useState, useTransition } from 'react'

import {
  deleteItem,
  previewLink,
  releaseClaim,
  reorderItems,
  saveItem,
  updateEventSettings,
  type ItemInput,
} from '../../app/(frontend)/registry/actions'
import type { HostItem, HostRegistry } from '../../lib/registry'
import { saveRegistryHost } from '../shop/AddToRegistry'
import { FUND_PRESETS, formatINR } from '../../lib/registryOptions'

type Auth = { slug: string; manageKey: string }
type Mode = 'link' | 'custom' | 'fund'

/** Gifts tab: add (link / shop / fund), edit, reorder, and claim progress. */
export function HostGifts({ auth, data }: { auth: Auth; data: HostRegistry }) {
  const { items, event } = data
  const gifts = items.filter((i) => i.itemType !== 'cash_fund')
  const claimed = gifts.filter((i) => i.claimed).length
  const [mode, setMode] = useState<Mode>('link')
  const [editing, setEditing] = useState<HostItem | null>(null)
  const [pending, start] = useTransition()

  function toggleReveal() {
    const on = !event.revealClaims
    if (on && !confirm('Show who claimed each gift? This spoils the surprise.')) return
    start(async () => {
      const res = await updateEventSettings(auth.slug, auth.manageKey, { revealClaims: on })
      if (!res.ok) alert(res.error)
    })
  }

  function move(index: number, dir: -1 | 1) {
    const ids = items.map((i) => i.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    start(async () => {
      const res = await reorderItems(auth.slug, auth.manageKey, ids)
      if (!res.ok) alert(res.error)
    })
  }

  function remove(item: HostItem) {
    if (!confirm(`Remove “${item.title}” from your registry?`)) return
    start(async () => {
      const res = await deleteItem(auth.slug, auth.manageKey, item.id)
      if (!res.ok) alert(res.error)
    })
  }

  function release(item: HostItem) {
    if (!confirm(`Make “${item.title}” available to other guests again?`)) return
    start(async () => {
      const res = await releaseClaim(auth.slug, auth.manageKey, item.id)
      if (!res.ok) alert(res.error)
    })
  }

  return (
    <div className="reg-host-gifts">
      <div className="reg-stats card">
        <div className="reg-stats__main">
          <strong className="reg-stats__num">
            {claimed} of {gifts.length}
          </strong>
          <span className="muted">gifts claimed</span>
        </div>
        <span className="reg-progress reg-stats__bar" aria-hidden="true">
          <span style={{ width: gifts.length ? `${(claimed / gifts.length) * 100}%` : 0 }} />
        </span>
        <label className="reg-switch">
          <input type="checkbox" checked={event.revealClaims} onChange={toggleReveal} disabled={pending} />
          <span>{event.revealClaims ? 'Showing who claimed what' : 'Surprise mode — names hidden'}</span>
        </label>
      </div>

      <div className="reg-add card">
        <h2 className="reg-section-title">Add a gift</h2>
        <div className="reg-seg" role="tablist" aria-label="Kind of gift">
          {(
            [
              ['link', 'Paste a link'],
              ['custom', 'Gift from any shop'],
              ['fund', 'Shagun fund'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`reg-seg__btn ${mode === m ? 'is-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'link' && <LinkAdder auth={auth} />}
        {mode === 'custom' && <ItemEditor auth={auth} initial={{ itemType: 'custom_offline', title: '' }} key="custom" />}
        {mode === 'fund' && <ItemEditor auth={auth} initial={{ itemType: 'cash_fund', title: '' }} key="fund" />}
        <div className="reg-shop">
          <p className="muted">
            Or pick decor, return gifts and more from the Zenfest Shop — each product gets an “Add” button for this
            registry.
          </p>
          <Link
            className="btn btn--gold"
            href="/shop"
            onClick={() => saveRegistryHost({ slug: auth.slug, key: auth.manageKey, title: event.title })}
          >
            Pick gifts from the Zenfest Shop
          </Link>
        </div>
      </div>

      <h2 className="reg-section-title">Your registry ({items.length})</h2>
      {items.length === 0 ? (
        <p className="muted">Nothing here yet — add your first gift above.</p>
      ) : (
        <ul className="reg-list">
          {items.map((item, i) => (
            <li key={item.id} className="reg-row">
              {editing?.id === item.id ? (
                <ItemEditor
                  auth={auth}
                  initial={{
                    id: item.id,
                    itemType: item.itemType,
                    title: item.title,
                    price: item.price,
                    imageUrl: item.imageUrl,
                    originalUrl: item.originalUrl,
                    note: item.note,
                    targetAmount: item.targetAmount,
                    raisedAmount: item.raisedAmount,
                  }}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="reg-row__img" src={item.imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <span className="reg-row__img reg-row__img--blank" aria-hidden="true">
                      {item.itemType === 'cash_fund' ? '₹' : '🎁'}
                    </span>
                  )}
                  <div className="reg-row__body">
                    <strong className="reg-row__title">{item.title}</strong>
                    <span className="muted reg-row__meta">
                      {item.itemType === 'cash_fund'
                        ? `Shagun fund · ${formatINR(item.raisedAmount)}${item.targetAmount ? ` of ${formatINR(item.targetAmount)}` : ''} received`
                        : [item.merchant || 'Any shop', item.price ? formatINR(item.price) : ''].filter(Boolean).join(' · ')}
                    </span>
                    {item.itemType !== 'cash_fund' &&
                      (item.claimed ? (
                        <span className="reg-badge reg-badge--claimed">
                          Claimed{item.claim ? ` by ${item.claim.guestName}` : ''}
                          {item.claim?.mode === 'offline' ? ' · buying from a shop' : ''}
                        </span>
                      ) : (
                        <span className="reg-badge reg-badge--free">Available</span>
                      ))}
                    {item.claim?.message && <q className="reg-row__msg">{item.claim.message}</q>}
                  </div>
                  <div className="reg-row__actions">
                    <button type="button" className="reg-icon" aria-label="Move up" onClick={() => move(i, -1)} disabled={pending || i === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="reg-icon"
                      aria-label="Move down"
                      onClick={() => move(i, 1)}
                      disabled={pending || i === items.length - 1}
                    >
                      ↓
                    </button>
                    <button type="button" className="reg-link" onClick={() => setEditing(item)}>
                      {item.itemType === 'cash_fund' ? 'Update' : 'Edit'}
                    </button>
                    {item.claimed && (
                      <button type="button" className="reg-link" onClick={() => release(item)} disabled={pending}>
                        Free up
                      </button>
                    )}
                    <button type="button" className="reg-link reg-link--danger" onClick={() => remove(item)} disabled={pending}>
                      Remove
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LinkAdder({ auth }: { auth: Auth }) {
  const [url, setUrl] = useState('')
  const [draft, setDraft] = useState<ItemInput | null>(null)
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()

  function fetchPreview(e: React.FormEvent) {
    e.preventDefault()
    setNote('')
    start(async () => {
      const res = await previewLink(auth.slug, auth.manageKey, url)
      if (!res.ok) {
        setNote(res.error)
        return
      }
      const p = res.preview
      if (!p.complete) {
        setNote('That store didn’t share all the details — please fill in what’s missing.')
      }
      setDraft({
        itemType: 'affiliate_link',
        title: p.title,
        price: p.price,
        imageUrl: p.imageUrl,
        originalUrl: p.url,
      })
    })
  }

  if (draft) {
    return (
      <>
        {note && <p className="field__hint">{note}</p>}
        <ItemEditor
          auth={auth}
          initial={draft}
          onDone={() => {
            setDraft(null)
            setUrl('')
            setNote('')
          }}
        />
      </>
    )
  }

  return (
    <form className="reg-linkbar" onSubmit={fetchPreview}>
      <label className="field">
        <span className="field__label">Product link from Amazon, Flipkart, Myntra or any store</span>
        <div className="reg-linkbar__row">
          <input
            type="url"
            inputMode="url"
            required
            placeholder="https://www.amazon.in/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn btn--primary" disabled={pending}>
            {pending ? 'Fetching…' : 'Add'}
          </button>
        </div>
      </label>
      {note && <p className="form__error">{note}</p>}
    </form>
  )
}

function ItemEditor({ auth, initial, onDone }: { auth: Auth; initial: ItemInput; onDone?: () => void }) {
  const [v, setV] = useState<ItemInput>(initial)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const isFund = v.itemType === 'cash_fund'
  const set = (k: keyof ItemInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((d) => ({ ...d, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      const res = await saveItem(auth.slug, auth.manageKey, v)
      if (!res.ok) {
        setError(res.error)
        return
      }
      if (onDone) onDone()
      else setV({ itemType: initial.itemType, title: '' })
    })
  }

  return (
    <form className="form reg-editor" onSubmit={submit}>
      {isFund && !v.id && (
        <div className="reg-presets" role="group" aria-label="Fund ideas">
          {FUND_PRESETS.map((p) => (
            <button key={p} type="button" className={`chip ${v.title === p ? 'is-active' : ''}`} onClick={() => setV((d) => ({ ...d, title: p }))}>
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="reg-editor__main">
        {!isFund && v.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="reg-editor__img" src={v.imageUrl} alt="" referrerPolicy="no-referrer" />
        )}
        <div className="reg-editor__fields">
          <label className="field">
            <span className="field__label">{isFund ? 'Fund name *' : 'Gift *'}</span>
            <input
              required
              maxLength={160}
              value={v.title}
              onChange={set('title')}
              placeholder={isFund ? 'e.g. Honeymoon fund' : 'e.g. Silver pooja set'}
            />
          </label>
          {isFund ? (
            <div className="form__row">
              <label className="field">
                <span className="field__label">Target (₹)</span>
                <input inputMode="numeric" value={v.targetAmount ?? ''} onChange={set('targetAmount')} />
              </label>
              {v.id && (
                <label className="field">
                  <span className="field__label">Received so far (₹)</span>
                  <input inputMode="numeric" value={v.raisedAmount ?? ''} onChange={set('raisedAmount')} />
                </label>
              )}
            </div>
          ) : (
            <label className="field">
              <span className="field__label">Approx. price (₹)</span>
              <input inputMode="numeric" value={v.price ?? ''} onChange={set('price')} />
            </label>
          )}
        </div>
      </div>
      {!isFund && (
        <label className="field">
          <span className="field__label">Photo link (optional)</span>
          <input type="url" value={v.imageUrl ?? ''} onChange={set('imageUrl')} placeholder="https://…" />
        </label>
      )}
      {v.itemType === 'affiliate_link' && v.id && (
        <label className="field">
          <span className="field__label">Product link</span>
          <input type="url" required value={v.originalUrl ?? ''} onChange={set('originalUrl')} />
        </label>
      )}
      <label className="field">
        <span className="field__label">{isFund ? 'What it’s for (optional)' : 'Note for guests (optional)'}</span>
        <textarea
          rows={2}
          maxLength={600}
          value={v.note ?? ''}
          onChange={set('note')}
          placeholder={isFund ? 'e.g. Helping us set up our first home together' : 'Colour, size, or where to buy it'}
        />
      </label>
      {error && <p className="form__error">{error}</p>}
      <div className="btn-row">
        <button className="btn btn--primary" disabled={pending}>
          {pending ? 'Saving…' : v.id ? 'Save changes' : 'Add to registry'}
        </button>
        {onDone && (
          <button type="button" className="btn btn--ghost" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
