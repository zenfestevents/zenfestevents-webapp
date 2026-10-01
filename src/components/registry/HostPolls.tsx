'use client'

import React, { useState, useTransition } from 'react'

import { createEventPoll, deleteEventPoll, setEventPollStatus } from '../../app/(frontend)/registry/actions'
import type { HostRegistry } from '../../lib/registry'
import { RESULTS_VISIBILITY } from '../../lib/pollOptions'

type Auth = { slug: string; manageKey: string }

const IDEAS = [
  ['Sangeet dress code colour?', 'Gold & maroon', 'Pastels', 'All white'],
  ['Dinner — what should we serve?', 'South Indian feast', 'North Indian', 'Both!'],
  ['First dance song?', 'Tamil melody', 'Bollywood classic', 'English pop'],
]

/** Polls tab: the family asks their guests something; results update as they vote. */
export function HostPolls({ auth, data }: { auth: Auth; data: HostRegistry }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [visibility, setVisibility] = useState('after-vote')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function applyIdea([q, ...opts]: string[]) {
    setQuestion(q)
    setOptions(opts)
  }

  function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      const res = await createEventPoll(auth.slug, auth.manageKey, { question, options, resultsVisibility: visibility })
      if (!res.ok) setError(res.error)
      else {
        setQuestion('')
        setOptions(['', ''])
      }
    })
  }

  function toggle(id: number, state: 'open' | 'closed') {
    start(async () => {
      const res = await setEventPollStatus(auth.slug, auth.manageKey, id, state === 'open' ? 'closed' : 'open')
      if (!res.ok) alert(res.error)
    })
  }

  function remove(id: number, q: string) {
    if (!confirm(`Delete the poll “${q}” and its votes?`)) return
    start(async () => {
      const res = await deleteEventPoll(auth.slug, auth.manageKey, id)
      if (!res.ok) alert(res.error)
    })
  }

  return (
    <div className="reg-host-polls">
      <form className="form reg-add card" onSubmit={create}>
        <h2 className="reg-section-title">Ask your guests</h2>
        <div className="reg-presets" role="group" aria-label="Poll ideas">
          {IDEAS.map((idea) => (
            <button key={idea[0]} type="button" className="chip" onClick={() => applyIdea(idea)}>
              {idea[0]}
            </button>
          ))}
        </div>
        <label className="field">
          <span className="field__label">Question *</span>
          <input required maxLength={200} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        {options.map((o, i) => (
          <label key={i} className="field">
            <span className="field__label">Option {i + 1}{i < 2 ? ' *' : ''}</span>
            <input
              required={i < 2}
              maxLength={120}
              value={o}
              onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </label>
        ))}
        {options.length < 6 && (
          <button type="button" className="reg-link" onClick={() => setOptions((all) => [...all, ''])}>
            + Add an option
          </button>
        )}
        <label className="field">
          <span className="field__label">Guests see the results</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            {RESULTS_VISIBILITY.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="form__error">{error}</p>}
        <button className="btn btn--primary form__submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add poll'}
        </button>
      </form>

      <h2 className="reg-section-title">Your polls ({data.polls.length})</h2>
      {data.polls.length === 0 ? (
        <p className="muted">No polls yet. Guests will see them in a “Polls” tab on your registry.</p>
      ) : (
        <ul className="reg-list">
          {data.polls.map(({ poll, results }) => (
            <li key={poll.id} className="reg-poll card">
              <div className="reg-poll__head">
                <strong>{poll.question}</strong>
                <span className={`reg-badge ${poll.state === 'open' ? 'reg-badge--free' : ''}`}>
                  {poll.state === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
              <ul className="poll-results">
                {poll.options.map((o) => {
                  const n = results?.counts[o.id] || 0
                  const pct = results?.total ? Math.round((n / results.total) * 100) : 0
                  return (
                    <li key={o.id} className="poll-result">
                      <span className="poll-result__fill" style={{ width: `${pct}%` }} aria-hidden="true" />
                      <span className="poll-result__label">{o.label}</span>
                      <span className="poll-result__pct">
                        {n} · {pct}%
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="reg-row__actions">
                <span className="muted">{results?.total ?? 0} votes</span>
                <button type="button" className="reg-link" onClick={() => toggle(poll.id, poll.state)} disabled={pending}>
                  {poll.state === 'open' ? 'Close voting' : 'Reopen'}
                </button>
                <button
                  type="button"
                  className="reg-link reg-link--danger"
                  onClick={() => remove(poll.id, poll.question)}
                  disabled={pending}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
