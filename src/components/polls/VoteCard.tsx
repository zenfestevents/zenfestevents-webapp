'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState, useTransition } from 'react'

import { castEventVote, castVote, signOutVoter } from '../../app/(frontend)/polls/actions'
import type { PollResults, PublicPoll } from '../../lib/polls'
import { whatsappLink } from '../../lib/site'
import type { VerifyMode } from '../PhoneVerify'
import { useLocalStorage, useNow, useOrigin, writeLocalStorage } from '../registry/useClient'
import { VoterSheet } from './VoterSheet'

type Voter = { verified: boolean; phoneTail: string } | null

const DEVICE_KEY = 'zf-device'
const EVENT_VOTES_KEY = 'zf-event-votes'

function closesIn(iso: string | null, now: number | null) {
  if (!iso || now === null) return ''
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3_600_000)
  if (h >= 48) return `Closes in ${Math.floor(h / 24)} days`
  if (h >= 1) return `Closes in ${h} h`
  return `Closes in ${Math.max(1, Math.floor(ms / 60_000))} min`
}

/**
 * Vote + results for one poll. `kind="public"` votes as the cookie voter (asking
 * for a phone first if needed); `kind="event"` is a family's registry poll and
 * votes once per device with no phone.
 */
export function VoteCard({
  poll,
  results: serverResults,
  myVote: serverVote,
  voter,
  verifyMode,
  kind = 'public',
  compact = false,
}: {
  poll: PublicPoll
  results: PollResults | null
  myVote: string | null
  voter?: Voter
  verifyMode?: VerifyMode
  kind?: 'public' | 'event'
  compact?: boolean
}) {
  const router = useRouter()
  const origin = useOrigin()
  const now = useNow(60_000)
  const [picked, setPicked] = useState<string | null>(null)
  const [localVote, setLocalVote] = useState<string | null>(null)
  const [localResults, setLocalResults] = useState<PollResults | null>(null)
  const [error, setError] = useState('')
  const [askVoter, setAskVoter] = useState(false)
  const [pending, start] = useTransition()

  // Event polls remember the vote per device in localStorage.
  const rawEventVotes = useLocalStorage(EVENT_VOTES_KEY)
  const eventVote = useMemo(() => {
    if (kind !== 'event') return null
    try {
      return (JSON.parse(rawEventVotes || '{}') as Record<string, string>)[poll.id] ?? null
    } catch {
      return null
    }
  }, [kind, rawEventVotes, poll.id])

  const myVote = localVote ?? serverVote ?? eventVote
  const results = serverResults ?? localResults
  const open = poll.state === 'open'

  // Live results while the poll is open and results are on screen.
  useEffect(() => {
    if (!open || !results) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 15_000)
    return () => clearInterval(t)
  }, [open, results, router])

  function deviceId() {
    let id = ''
    try {
      id = localStorage.getItem(DEVICE_KEY) || ''
    } catch {}
    if (!id) {
      id = crypto.randomUUID()
      writeLocalStorage(DEVICE_KEY, id)
    }
    return id
  }

  function vote(optionId: string) {
    setError('')
    start(async () => {
      const res =
        kind === 'event' ? await castEventVote(poll.id, optionId, deviceId()) : await castVote(poll.slug, optionId)
      if (res.ok) {
        setLocalVote(res.myVote)
        setLocalResults(res.results)
        if (kind === 'event') {
          let all: Record<string, string> = {}
          try {
            all = JSON.parse(localStorage.getItem(EVENT_VOTES_KEY) || '{}')
          } catch {}
          writeLocalStorage(EVENT_VOTES_KEY, JSON.stringify({ ...all, [poll.id]: res.myVote }))
        }
        if (res.alreadyVoted) setError('You had already voted on this poll — here’s your vote.')
      } else if ('needVoter' in res || 'needVerified' in res) {
        setAskVoter(true)
      } else {
        setError(res.error)
      }
    })
  }

  const shareText = `${poll.question}\n\nVote here 👉 ${origin}/polls/${poll.slug}`
  const showResults = Boolean(results) && (Boolean(myVote) || !open)
  const leaderCount = results ? Math.max(0, ...Object.values(results.counts)) : 0

  return (
    <div className={`poll-vote ${compact ? 'poll-vote--compact' : ''}`}>
      {poll.electionSensitive && (
        <p className="poll-note">Opinion poll of website visitors — not a prediction or survey.</p>
      )}

      {showResults && results ? (
        <ul className="poll-results" aria-label="Results">
          {poll.options.map((o) => {
            const n = results.counts[o.id] || 0
            const pct = results.total ? Math.round((n / results.total) * 100) : 0
            const mine = o.id === myVote
            const lead = n > 0 && n === leaderCount
            return (
              <li key={o.id} className={`poll-result ${mine ? 'is-mine' : ''} ${lead ? 'is-lead' : ''}`}>
                <span className="poll-result__fill" style={{ width: `${pct}%` }} aria-hidden="true" />
                <span className="poll-result__label">
                  {o.label}
                  {mine && <span className="poll-result__you"> · your vote</span>}
                </span>
                <span className="poll-result__pct">{pct}%</span>
              </li>
            )
          })}
        </ul>
      ) : myVote ? (
        <p className="poll-voted">
          ✓ You voted <strong>{poll.options.find((o) => o.id === myVote)?.label}</strong>.{' '}
          {poll.electionSensitive || poll.resultsVisibility === 'after-close'
            ? 'Results appear when the poll closes.'
            : ''}
        </p>
      ) : open ? (
        <div className="poll-options" role="radiogroup" aria-label={poll.question}>
          {poll.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={picked === o.id}
              className={`poll-option ${picked === o.id ? 'is-picked' : ''}`}
              onClick={() => setPicked(o.id)}
              disabled={pending}
            >
              <span className="poll-option__dot" aria-hidden="true" />
              {o.label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--primary poll-submit"
            disabled={!picked || pending}
            onClick={() => picked && vote(picked)}
          >
            {pending ? 'Voting…' : 'Vote'}
          </button>
        </div>
      ) : (
        <p className="muted">This poll has closed.</p>
      )}

      {error && <p className="form__error">{error}</p>}

      <div className="poll-vote__foot">
        <span className="muted">
          {results ? (
            <>
              {results.total.toLocaleString('en-IN')} vote{results.total === 1 ? '' : 's'}
              {kind === 'public' && results.total > 0 && ` · ${results.verified.toLocaleString('en-IN')} verified`}
            </>
          ) : (
            open && closesIn(poll.closesAt, now)
          )}
          {results && open && closesIn(poll.closesAt, now) ? ` · ${closesIn(poll.closesAt, now)}` : ''}
        </span>
        {kind === 'public' && !compact && (
          <a className="btn btn--whatsapp poll-share" href={whatsappLink('', shareText)} target="_blank" rel="noopener">
            Share on WhatsApp
          </a>
        )}
      </div>

      {kind === 'public' && voter && !compact && (
        <p className="field__hint poll-who">
          Voting as ••••••{voter.phoneTail}
          {voter.verified ? ' ✓ verified' : ''} ·{' '}
          <button type="button" className="reg-link" onClick={() => start(async () => void (await signOutVoter()))}>
            Not you?
          </button>
        </p>
      )}

      {kind === 'public' && myVote && !compact && (
        <div className="poll-cta card">
          <p>{poll.cta.text}</p>
          <Link className="btn btn--gold" href={poll.cta.href}>
            {poll.cta.label}
          </Link>
        </div>
      )}

      {askVoter && verifyMode && (
        <VoterSheet
          mode={verifyMode}
          onClose={() => setAskVoter(false)}
          onDone={() => {
            setAskVoter(false)
            if (picked) vote(picked)
          }}
        />
      )}
    </div>
  )
}
