'use client'

import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { claimItem, undoClaim } from '../../app/(frontend)/registry/actions'
import type { EventPollView, PublicEvent, PublicItem } from '../../lib/registry'
import { VoteCard } from '../polls/VoteCard'
import { GIFT_AMOUNTS, formatINR } from '../../lib/registryOptions'
import { QrCode } from './QrCode'
import { useLocalStorage, useNow, writeLocalStorage } from './useClient'

type MyClaims = Record<string, { token: string; at: number; goUrl: string | null }>

const UNDO_MS = 30 * 60 * 1000
const storeKey = (slug: string) => `zf-registry-${slug}`

function parseClaims(raw: string | null): MyClaims {
  try {
    return JSON.parse(raw || '{}') as MyClaims
  } catch {
    return {}
  }
}
// Best effort: in private mode the claim still stands, the guest just can't undo it.
const writeClaims = (slug: string, claims: MyClaims) => writeLocalStorage(storeKey(slug), JSON.stringify(claims))

/** Guest view of a registry: wishlist with duplicate-proof claiming, and shagun. */
export function GuestRegistry({
  event,
  items,
  polls = [],
}: {
  event: PublicEvent
  items: PublicItem[]
  polls?: EventPollView[]
}) {
  const router = useRouter()
  const gifts = items.filter((i) => i.itemType !== 'cash_fund')
  const funds = items.filter((i) => i.itemType === 'cash_fund')
  const showShagun = funds.length > 0 || Boolean(event.upiId)
  const [tab, setTab] = useState<'gifts' | 'shagun' | 'polls'>(gifts.length || !showShagun ? 'gifts' : 'shagun')
  const tabs = [
    ['gifts', 'Gift wishlist', true],
    ['shagun', 'Shagun', showShagun],
    ['polls', 'Polls', polls.length > 0],
  ] as const
  const visibleTabs = tabs.filter(([, , show]) => show)
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [claiming, setClaiming] = useState<PublicItem | null>(null)
  const rawMine = useLocalStorage(storeKey(event.slug))
  const mine = useMemo(() => parseClaims(rawMine), [rawMine])
  const now = useNow(60_000)

  // Keep "Claimed" badges fresh while the page is open (another guest may claim).
  // Paused while the claim dialog is open so the form isn't re-rendered under the guest.
  useEffect(() => {
    if (claiming) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 20_000)
    return () => clearInterval(t)
  }, [router, claiming])

  const remember = useCallback(
    (id: number, token: string, goUrl: string | null) => {
      writeClaims(event.slug, { ...mine, [id]: { token, at: Date.now(), goUrl } })
    },
    [event.slug, mine],
  )

  async function undo(id: number) {
    const c = mine[id]
    if (!c) return
    const res = await undoClaim(event.slug, id, c.token)
    if (!res.ok) {
      alert(res.error)
      return
    }
    const next = { ...mine }
    delete next[id]
    writeClaims(event.slug, next)
  }

  const shown = onlyAvailable ? gifts.filter((g) => !g.claimed || mine[g.id]) : gifts
  const claimedCount = gifts.filter((g) => g.claimed).length

  return (
    <div className="reg-guest">
      {visibleTabs.length > 1 && (
        <div className="reg-tabs" role="tablist" aria-label="Registry sections">
          {visibleTabs.map(([t, label]) => (
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
        </div>
      )}

      {tab === 'gifts' && (
        <section aria-label="Gift wishlist">
          {gifts.length === 0 ? (
            <p className="reg-empty muted">The family hasn’t added gifts yet — check back soon.</p>
          ) : (
            <>
              <div className="reg-toolbar">
                <p className="muted">
                  {gifts.length - claimedCount} of {gifts.length} gifts still available
                </p>
                <label className="reg-switch">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                  />
                  <span>Hide claimed</span>
                </label>
              </div>
              <ul className="reg-grid">
                {shown.map((item) => (
                  <GiftCard
                    key={item.id}
                    item={item}
                    mine={mine[item.id]}
                    now={now}
                    onClaim={() => setClaiming(item)}
                    onUndo={() => undo(item.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === 'shagun' && <ShagunPanel event={event} funds={funds} />}

      {tab === 'polls' && (
        <section className="reg-polls" aria-label="Polls">
          {polls.map(({ poll, results }) => (
            <article key={poll.id} className="poll-feature card">
              <h3 className="poll-feature__q poll-feature__q--small">{poll.question}</h3>
              <VoteCard poll={poll} results={results} myVote={null} kind="event" />
            </article>
          ))}
        </section>
      )}

      {claiming && (
        <ClaimDialog
          slug={event.slug}
          item={claiming}
          onClose={() => setClaiming(null)}
          onClaimed={(token, goUrl) => remember(claiming.id, token, goUrl)}
        />
      )}
    </div>
  )
}

function GiftImage({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="reg-card__img reg-card__img--blank" aria-hidden="true">
        <span>🎁</span>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="reg-card__img"
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  )
}

function GiftCard({
  item,
  mine,
  now,
  onClaim,
  onUndo,
}: {
  item: PublicItem
  mine?: MyClaims[string]
  now: number | null
  onClaim: () => void
  onUndo: () => void
}) {
  const canUndo = mine && now !== null && now - mine.at < UNDO_MS
  return (
    <li className={`reg-card ${item.claimed && !mine ? 'is-claimed' : ''}`}>
      <GiftImage src={item.imageUrl} alt="" />
      <div className="reg-card__body">
        {item.merchant ? (
          <span className="reg-card__merchant">{item.merchant}</span>
        ) : (
          item.itemType === 'custom_offline' && <span className="reg-card__merchant">Any shop</span>
        )}
        <h3 className="reg-card__title">{item.title}</h3>
        {item.price != null && item.price > 0 && <p className="reg-card__price">{formatINR(item.price)}</p>}
        {item.note && <p className="reg-card__note muted">{item.note}</p>}
      </div>
      <div className="reg-card__action">
        {mine ? (
          <>
            <span className="reg-badge reg-badge--mine">You’re gifting this</span>
            <div className="reg-card__mine">
              {mine.goUrl && (
                <a className="btn btn--gold reg-card__btn" href={mine.goUrl} target="_blank" rel="noopener">
                  Open store
                </a>
              )}
              {canUndo && (
                <button type="button" className="reg-link" onClick={onUndo}>
                  Undo
                </button>
              )}
            </div>
          </>
        ) : item.claimed ? (
          <span className="reg-badge">Claimed</span>
        ) : (
          <button type="button" className="btn btn--primary reg-card__btn" onClick={onClaim}>
            I’ll gift this
          </button>
        )}
      </div>
    </li>
  )
}

function ClaimDialog({
  slug,
  item,
  onClose,
  onClaimed,
}: {
  slug: string
  item: PublicItem
  onClose: () => void
  onClaimed: (token: string, goUrl: string | null) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [stage, setStage] = useState<'form' | 'sending' | 'done' | 'taken'>('form')
  const [error, setError] = useState('')
  const [goUrl, setGoUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<'online' | 'offline'>(item.hasLink ? 'online' : 'offline')

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setStage('sending')
    setError('')
    const res = await claimItem(slug, item.id, {
      guestName: String(fd.get('guestName') || ''),
      message: String(fd.get('message') || ''),
      mode,
      company: String(fd.get('company') || ''),
    })
    if (res.ok) {
      onClaimed(res.undoToken, res.goUrl)
      setGoUrl(res.goUrl)
      setStage('done')
    } else if ('taken' in res) {
      setStage('taken')
    } else {
      setError(res.error)
      setStage('form')
    }
  }

  return (
    <dialog ref={ref} className="reg-dialog" onClose={onClose} aria-labelledby="claim-title">
      <div className="reg-dialog__inner">
        <button type="button" className="reg-dialog__close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {stage === 'done' ? (
          <div className="form-success">
            <h2 className="reg-dialog__title" id="claim-title">
              It’s yours to gift ✨
            </h2>
            <p className="muted">
              We’ve marked <strong>{item.title}</strong> as claimed so nobody else buys it. The family won’t
              see it’s from you until they choose to.
            </p>
            {goUrl ? (
              <>
                <a className="btn btn--primary" href={goUrl} target="_blank" rel="noopener">
                  Continue to {item.merchant || 'the store'} →
                </a>
                <p className="field__hint">
                  Changed your mind? Tap “Undo” on the gift within 30 minutes.
                </p>
              </>
            ) : (
              <button type="button" className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            )}
          </div>
        ) : stage === 'taken' ? (
          <div className="form-success">
            <h2 className="reg-dialog__title" id="claim-title">
              Just missed it
            </h2>
            <p className="muted">Another guest claimed this gift a moment ago. Please pick another one.</p>
            <button type="button" className="btn btn--primary" onClick={onClose}>
              See other gifts
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">I’ll gift this</p>
            <h2 className="reg-dialog__title" id="claim-title">
              {item.title}
            </h2>
            <form className="form" onSubmit={onSubmit}>
              <input type="text" name="company" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <label className="field">
                <span className="field__label">Your name *</span>
                <input name="guestName" required maxLength={80} autoComplete="name" />
                <span className="field__hint">Kept private — the family only sees it if they choose to.</span>
              </label>
              <label className="field">
                <span className="field__label">A note for the family (optional)</span>
                <textarea name="message" rows={3} maxLength={600} />
              </label>
              {item.hasLink && (
                <fieldset className="choice">
                  <legend className="field__label">How will you buy it?</legend>
                  <label className="choice__option">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === 'online'}
                      onChange={() => setMode('online')}
                    />
                    Online, using the link{item.merchant ? ` (${item.merchant})` : ''}
                  </label>
                  <label className="choice__option">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === 'offline'}
                      onChange={() => setMode('offline')}
                    />
                    I’ll get it from a shop
                  </label>
                </fieldset>
              )}
              {error && <p className="form__error">{error}</p>}
              <button className="btn btn--primary form__submit" disabled={stage === 'sending'}>
                {stage === 'sending' ? 'Reserving…' : 'Reserve this gift'}
              </button>
            </form>
          </>
        )}
      </div>
    </dialog>
  )
}

function ShagunPanel({ event, funds }: { event: PublicEvent; funds: PublicItem[] }) {
  const [fundId, setFundId] = useState<number | null>(funds[0]?.id ?? null)
  const [amount, setAmount] = useState<number>(GIFT_AMOUNTS[1])
  const [custom, setCustom] = useState('')
  const fund = funds.find((f) => f.id === fundId)
  const value = custom ? Math.round(Number(custom)) || 0 : amount

  const upiLink = useMemo(() => {
    if (!event.upiId) return ''
    const params = new URLSearchParams({
      pa: event.upiId,
      pn: event.upiName || event.hostNames || event.title,
      cu: 'INR',
      tn: (fund ? `${fund.title} – ${event.title}` : `Shagun – ${event.title}`).slice(0, 60),
    })
    if (value > 0) params.set('am', String(value))
    return `upi://pay?${params.toString().replace(/\+/g, '%20')}`
  }, [event, fund, value])

  return (
    <section className="reg-shagun" aria-label="Shagun">
      {funds.length > 0 && (
        <ul className="reg-funds">
          {funds.map((f) => {
            const pct = f.targetAmount ? Math.min(100, Math.round((f.raisedAmount / f.targetAmount) * 100)) : null
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className={`reg-fund ${fundId === f.id ? 'is-active' : ''}`}
                  aria-pressed={fundId === f.id}
                  onClick={() => setFundId(f.id)}
                >
                  <span className="reg-fund__title">{f.title}</span>
                  {f.note && <span className="reg-fund__note muted">{f.note}</span>}
                  {pct !== null && (
                    <>
                      <span className="reg-progress" aria-hidden="true">
                        <span style={{ width: `${pct}%` }} />
                      </span>
                      <span className="reg-fund__meta muted">
                        {formatINR(f.raisedAmount)} of {formatINR(f.targetAmount)} · {pct}%
                      </span>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="reg-pay card">
        <h3 className="reg-pay__title">Send your blessings</h3>
        {event.upiId ? (
          <>
            <div className="reg-amounts" role="group" aria-label="Amount">
              {GIFT_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`chip ${!custom && amount === a ? 'is-active' : ''}`}
                  onClick={() => {
                    setAmount(a)
                    setCustom('')
                  }}
                >
                  {formatINR(a)}
                </button>
              ))}
              <label className="reg-amounts__custom">
                <span className="sr-only">Other amount</span>
                <input
                  inputMode="numeric"
                  placeholder="Other ₹"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 7))}
                />
              </label>
            </div>
            <div className="reg-pay__row">
              <div className="reg-pay__qr">
                <QrCode value={upiLink} label={`UPI QR code to pay ${formatINR(value)}`} />
                <span className="field__hint">Scan with any UPI app</span>
              </div>
              <div className="reg-pay__go">
                <a className="btn btn--primary" href={upiLink}>
                  Pay {value > 0 ? formatINR(value) : ''} with UPI
                </a>
                <p className="field__hint">
                  Opens GPay, PhonePe, Paytm or your bank app. Paid straight to{' '}
                  <strong>{event.upiName || event.upiId}</strong> — Zenfest never handles this money.
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="muted">
            The family hasn’t added payment details yet. You’re welcome to bring your shagun to the
            celebration.
          </p>
        )}
      </div>
    </section>
  )
}
