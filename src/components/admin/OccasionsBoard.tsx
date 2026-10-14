'use client'

import React, { useState } from 'react'
import Link from 'next/link'

import { formatDay, parseYmdKey, relativeDays } from '../../lib/occasions/dates'
import { RunRemindersButton, SendWhatsAppButton } from './SendWhatsApp'

export type BoardItem = {
  key: string
  reminderId?: number
  name: string
  milestone: string
  type: string
  /** YYYY-MM-DD (India date). */
  date: string
  days: number
  relationship: string | null
  phone?: string
  message?: string
  href: string
}

type Stats = { sent: number; interested: number; booked: number; contacts: number; unverified: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PENDING_LIST = '/admin/collections/reminders?where[status][equals]=pending&sort=occurrenceDate'
const ADD_CONTACT = '/admin/collections/contacts/create'

/** The "Occasion reminders" block at the top of the admin dashboard. */
export function OccasionsBoard({ toSend, comingUp, stats }: { toSend: BoardItem[]; comingUp: BoardItem[]; stats: Stats }) {
  const [tab, setTab] = useState<'send' | 'soon'>(toSend.length || !comingUp.length ? 'send' : 'soon')
  const [sentNow, setSentNow] = useState<Set<string>>(new Set())
  const waiting = toSend.length - sentNow.size
  const next = toSend.find((i) => !sentNow.has(i.key)) ?? comingUp[0]
  const items = tab === 'send' ? toSend : comingUp

  return (
    <section className="zf-occ" aria-labelledby="zf-occ-title">
      <header className="zf-occ__hero">
        <div className="zf-occ__intro">
          <p className="zf-eyebrow">Occasion reminders</p>
          <h2 id="zf-occ-title" className="zf-occ__title">
            {waiting > 0 ? (
              <>
                <span className="zf-occ__count">{waiting}</span> {waiting === 1 ? 'wish' : 'wishes'} to send
              </>
            ) : stats.contacts ? (
              'All caught up'
            ) : (
              'Never miss a celebration'
            )}
          </h2>
          <p className="zf-occ__lede">
            {next
              ? `Next: ${next.name} — ${next.milestone.charAt(0).toLowerCase()}${next.milestone.slice(1)}, ${formatDay(parseYmdKey(next.date)!)} (${relativeDays(next.days)}).`
              : 'Add past clients and leads with their birthdays and anniversaries. We will line up a WhatsApp wish before each one.'}
          </p>
        </div>
        <div className="zf-occ__actions">
          <Link href={ADD_CONTACT} className="zf-btn zf-btn--gold">
            + Add contact
          </Link>
          <RunRemindersButton />
        </div>
      </header>

      <dl className="zf-stats">
        <Stat label="Contacts" value={stats.contacts} href="/admin/collections/contacts?sort=nextOccasionDate">
          {stats.unverified > 0 ? (
            <Link href="/admin/collections/contacts?where[verified][equals]=false" className="zf-stat__flag">
              {stats.unverified} to verify
            </Link>
          ) : (
            'all verified'
          )}
        </Stat>
        <Stat label="Coming up" value={comingUp.length + toSend.length}>
          in the next 60 days
        </Stat>
        <Stat label="Sent this month" value={stats.sent + sentNow.size}>
          WhatsApp wishes
        </Stat>
        <Stat label="Interested this month" value={stats.interested} highlight={stats.booked > 0}>
          {stats.booked} booked
        </Stat>
      </dl>

      <div className="zf-queue">
        <div className="zf-tabs" role="tablist" aria-label="Reminders">
          <TabButton active={tab === 'send'} onClick={() => setTab('send')} count={waiting}>
            To send
          </TabButton>
          <TabButton active={tab === 'soon'} onClick={() => setTab('soon')} count={comingUp.length}>
            Coming up
          </TabButton>
          <Link href={PENDING_LIST} className="zf-tabs__all">
            Open full list →
          </Link>
        </div>

        <div role="tabpanel">
          {items.length === 0 ? (
            <Empty tab={tab} hasContacts={stats.contacts > 0} />
          ) : (
            <ol className="zf-rows">
              {items.map((item) => (
                <Row
                  key={item.key}
                  item={item}
                  sent={sentNow.has(item.key)}
                  onSent={() => setSentNow((s) => new Set(s).add(item.key))}
                />
              ))}
            </ol>
          )}
          {tab === 'soon' && items.length > 0 && (
            <p className="zf-queue__note">
              Each one moves to <strong>To send</strong> on its reminder day (set in Reminder Settings).
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  href,
  highlight,
  children,
}: {
  label: string
  value: number
  href?: string
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`zf-stat${highlight ? ' zf-stat--gold' : ''}`}>
      <dt>{href ? <Link href={href}>{label}</Link> : label}</dt>
      <dd className="zf-stat__value">{value}</dd>
      <dd className="zf-stat__sub">{children}</dd>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button type="button" role="tab" aria-selected={active} className="zf-tab" onClick={onClick}>
      {children}
      <span className="zf-tab__count">{count}</span>
    </button>
  )
}

function Row({ item, sent, onSent }: { item: BoardItem; sent: boolean; onSent: () => void }) {
  const ymd = parseYmdKey(item.date)!
  const urgency = item.days <= 0 ? 'today' : item.days <= 3 ? 'soon' : 'later'
  return (
    <li className={`zf-row${sent ? ' zf-row--done' : ''}`}>
      <time className="zf-date" dateTime={item.date}>
        <span className="zf-date__day">{ymd.d}</span>
        <span className="zf-date__month">{MONTHS[ymd.m - 1]}</span>
      </time>
      <OccasionGlyph type={item.type} />
      <div className="zf-row__main">
        <Link href={item.href} className="zf-row__name">
          {item.name}
        </Link>
        <span className="zf-row__what">{item.milestone}</span>
      </div>
      {item.relationship && (
        <span className={`zf-tag zf-tag--${item.relationship}`}>{item.relationship === 'client' ? 'Client' : item.relationship === 'lead' ? 'Lead' : 'Cold'}</span>
      )}
      <span className={`zf-when zf-when--${urgency}`}>{relativeDays(item.days)}</span>
      <span className="zf-row__action">
        {item.reminderId && item.phone ? (
          <SendWhatsAppButton
            id={item.reminderId}
            phone={item.phone}
            message={item.message}
            status={sent ? 'sent' : 'pending'}
            variant="button"
            onSent={onSent}
          />
        ) : (
          <Link href={item.href} className="zf-btn zf-btn--quiet">
            View contact
          </Link>
        )}
      </span>
    </li>
  )
}

function Empty({ tab, hasContacts }: { tab: 'send' | 'soon'; hasContacts: boolean }) {
  if (!hasContacts) {
    return (
      <div className="zf-empty">
        <ol className="zf-steps">
          <li>
            <strong>Add a contact</strong> — a past client or a lead, with their WhatsApp number.
          </li>
          <li>
            <strong>Add their occasions</strong> — birthday, wedding, children&rsquo;s birthdays, housewarming.
          </li>
          <li>
            <strong>Send the wish</strong> — a ready WhatsApp message appears here before each date.
          </li>
        </ol>
        <Link href={ADD_CONTACT} className="zf-btn zf-btn--gold">
          Add the first contact
        </Link>
      </div>
    )
  }
  return (
    <div className="zf-empty zf-empty--quiet">
      {tab === 'send'
        ? 'Nothing waiting. New reminders appear here automatically, a few days before each occasion.'
        : 'No occasions in the next 60 days.'}
    </div>
  )
}

/** Small line icons, one per occasion type (1.5px stroke, currentColor). */
function OccasionGlyph({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    birthday: (
      <>
        <path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" />
        <path d="M5 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 1.5-.6 2-.4M12 12V8.5" />
        <path d="M12 6.5c-.8 0-1.3-.6-1.3-1.3 0-.9 1.3-2.2 1.3-2.2s1.3 1.3 1.3 2.2c0 .7-.5 1.3-1.3 1.3Z" />
      </>
    ),
    wedding: (
      <>
        <circle cx="9" cy="14" r="5" />
        <circle cx="15" cy="14" r="5" />
        <path d="m10 5 2-2 2 2-2 2-2-2Z" />
      </>
    ),
    housewarming: (
      <>
        <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    corporate: (
      <>
        <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
        <path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17" />
      </>
    ),
    other: <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7L12 3Z" />,
  }
  const key =
    type === 'birthday' || type === 'kid_birthday'
      ? 'birthday'
      : type === 'wedding_anniversary' || type === 'engagement_anniversary'
        ? 'wedding'
        : type === 'housewarming_anniversary'
          ? 'housewarming'
          : type === 'corporate_annual'
            ? 'corporate'
            : 'other'
  return (
    <span className={`zf-glyph zf-glyph--${key}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {paths[key]}
      </svg>
    </span>
  )
}
