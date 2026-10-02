'use client'

// The questions asked before a Zenfest AI chat starts: the event, who's planning, when
// (a month for each wedding function, exact date optional), where, guests, services and
// how to reach them, then a Confirm step that names the specialists and offers to add
// more. Every step is mandatory (checkIntakeStep — the server runs the same rules).
// Sending it saves a lead at once (startChat).
import React, { useState } from 'react'

import {
  COMPLETE_PLANNING,
  COMPLETE_PLANNING_LABEL,
  FAMILY_RELATIONS,
  INTAKE_EVENT_TYPES,
  INTAKE_STEPS,
  PLANNER_ROLES,
  WEDDING_FUNCTIONS,
  checkIntakeStep,
  isWeddingType,
  minMonth,
  todayIST,
  type IntakeDetails,
  type IntakeEventType,
  type When,
} from '../../lib/ai/intake'
import { useZenfestAI } from './ZenfestAIProvider'

const DEFAULT_FUNCTIONS = ['Muhurtham (wedding)', 'Reception']
const NO_WHEN: When = { month: '', date: '' }

/** Single-choice pill buttons. */
function Pills<T extends string>(props: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T | ''
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="zai-intake__field">
      <legend>
        {props.label} <span className="zai-req">*</span>
      </legend>
      <div className="zai-intake__pills" role="radiogroup">
        {props.options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={props.value === o.value}
            className={props.value === o.value ? 'is-on' : ''}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Required month + optional exact date (limited to that month). */
function WhenInputs({ value, onChange, what }: { value: When; onChange: (w: When) => void; what: string }) {
  const today = todayIST()
  const monthEnd = value.month
    ? new Date(Date.UTC(+value.month.slice(0, 4), +value.month.slice(5, 7), 0)).toISOString().slice(0, 10)
    : undefined
  const monthStart = value.month ? `${value.month}-01` : undefined
  return (
    <div className="zai-intake__when">
      <label>
        <span>
          Month <span className="zai-req">*</span>
        </span>
        <input
          type="month"
          min={minMonth()}
          value={value.month}
          aria-label={`${what} month`}
          // A new month invalidates an exact date from another month.
          onChange={(e) => onChange({ month: e.target.value, date: value.date.startsWith(e.target.value) ? value.date : '' })}
        />
      </label>
      <label>
        <span>Exact date (if fixed)</span>
        <input
          type="date"
          disabled={!value.month}
          min={monthStart && monthStart > today ? monthStart : today}
          max={monthEnd}
          value={value.date}
          aria-label={`${what} exact date`}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
      </label>
    </div>
  )
}

export function IntakeForm() {
  const { agents, intakeNote, startWithIntake, busy, lastIntake } = useZenfestAI()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  const [eventType, setEventType] = useState<IntakeEventType | ''>('')
  const [planner, setPlanner] = useState('')
  const [relation, setRelation] = useState('')
  const [functions, setFunctions] = useState<Record<string, { on: boolean } & When>>(() =>
    Object.fromEntries(WEDDING_FUNCTIONS.map((f) => [f, { on: DEFAULT_FUNCTIONS.includes(f), ...NO_WHEN }])),
  )
  const [event, setEvent] = useState<When>(NO_WHEN)
  const [area, setArea] = useState('')
  const [guests, setGuests] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [notes, setNotes] = useState(intakeNote)
  // Name/phone: prefilled after "New chat" (and, once customer accounts exist, from the
  // profile) — then shown as "Is this you?" with a Change link instead of empty fields.
  const known = lastIntake ? { name: lastIntake.name, phone: lastIntake.phone } : null
  const [editContact, setEditContact] = useState(!known)
  const [name, setName] = useState(known?.name ?? '')
  const [phone, setPhone] = useState(known?.phone ?? '')
  const [consent, setConsent] = useState(Boolean(known))
  const [company, setCompany] = useState('')

  const wedding = isWeddingType(eventType)
  const roles = wedding ? PLANNER_ROLES.wedding : PLANNER_ROLES.other
  const slugs = agents.map((a) => a.slug)
  const complete = services.includes(COMPLETE_PLANNING)

  const details = (): Partial<IntakeDetails> => ({
    eventType: eventType || undefined,
    planner,
    relation: planner === 'family' ? relation : '',
    functions: wedding
      ? WEDDING_FUNCTIONS.filter((f) => functions[f].on).map((f) => ({
          name: f,
          month: functions[f].month,
          date: functions[f].date,
        }))
      : [],
    event: wedding ? NO_WHEN : event,
    area: area.trim(),
    guests: Number(guests) >= 1 ? Math.round(Number(guests)) : null,
    services,
    notes: notes.trim(),
    name: name.trim(),
    phone: phone.trim(),
  })

  const chooseEvent = (v: IntakeEventType) => {
    setEventType(v)
    // Bride/groom only make sense for weddings; reset the role when switching kinds.
    if (isWeddingType(v) !== wedding) setPlanner('')
  }

  // "Complete event planning" stands for every service, so it and single picks exclude each other.
  const toggleService = (slug: string) =>
    setServices((cur) => {
      if (slug === COMPLETE_PLANNING) return cur.includes(slug) ? [] : [COMPLETE_PLANNING]
      const singles = cur.filter((s) => s !== COMPLETE_PLANNING)
      return singles.includes(slug) ? singles.filter((s) => s !== slug) : [...singles, slug]
    })

  const go = (to: number) => {
    setError('')
    setStep(to)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 3) {
      const problem = checkIntakeStep(step, details(), slugs) || (step === 2 && !consent ? 'Please tick the box so our team may call you.' : '')
      setError(problem)
      if (!problem) setStep(step + 1)
      return
    }
    const d = details()
    for (let s = 0; s < 3; s++) {
      const problem = checkIntakeStep(s, d, slugs)
      if (problem) {
        setStep(s)
        setError(problem)
        return
      }
    }
    const err = await startWithIntake({ ...(d as IntakeDetails), consent, company })
    if (err) setError(err)
  }

  const assigned = complete ? agents : agents.filter((a) => services.includes(a.slug))
  const notChosen = complete ? [] : agents.filter((a) => !services.includes(a.slug))

  return (
    <form className="zai-intake" onSubmit={submit} noValidate>
      <div className="zai-intake__head">
        <p className="zai-intake__title">{INTAKE_STEPS[step]}</p>
        <p className="zai-intake__step">
          Step {step + 1} of {INTAKE_STEPS.length}
        </p>
      </div>
      <div className="zai-intake__bar" aria-hidden="true">
        <span style={{ width: `${((step + 1) / INTAKE_STEPS.length) * 100}%` }} />
      </div>

      {step === 0 && (
        <>
          <Pills label="What are you celebrating?" options={INTAKE_EVENT_TYPES} value={eventType} onChange={chooseEvent} />
          {eventType && (
            <Pills
              label={wedding ? 'Who are you?' : 'Who is planning?'}
              options={roles}
              value={planner}
              onChange={(v) => setPlanner(v)}
            />
          )}
          {planner === 'family' && (
            <label className="zai-intake__field">
              <span>
                Your relation{wedding ? ' to the couple' : ''} <span className="zai-req">*</span>
              </span>
              <select value={relation} onChange={(e) => setRelation(e.target.value)}>
                <option value="">Choose…</option>
                {FAMILY_RELATIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      {step === 1 && (
        <>
          {wedding ? (
            <fieldset className="zai-intake__field">
              <legend>
                Which functions are you planning? <span className="zai-req">*</span>
              </legend>
              <p className="zai-intake__hint">Pick the month for each — add the exact date if it’s fixed.</p>
              <div className="zai-intake__functions">
                {WEDDING_FUNCTIONS.map((f) => (
                  <div key={f} className={`zai-intake__fn ${functions[f].on ? 'is-on' : ''}`}>
                    <label className="zai-intake__fn-name">
                      <input
                        type="checkbox"
                        checked={functions[f].on}
                        onChange={(e) => setFunctions((cur) => ({ ...cur, [f]: { ...cur[f], on: e.target.checked } }))}
                      />
                      <span>{f}</span>
                    </label>
                    {functions[f].on && (
                      <WhenInputs
                        what={f}
                        value={functions[f]}
                        onChange={(w) => setFunctions((cur) => ({ ...cur, [f]: { ...cur[f], ...w } }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
          ) : (
            <fieldset className="zai-intake__field">
              <legend>
                When is it? <span className="zai-req">*</span>
              </legend>
              <WhenInputs what="Event" value={event} onChange={setEvent} />
            </fieldset>
          )}
          <label className="zai-intake__field">
            <span>
              Where is it happening? <span className="zai-req">*</span>
            </span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area or venue, e.g. Tambaram, Guduvancheri"
              maxLength={120}
            />
          </label>
          <label className="zai-intake__field">
            <span>
              Roughly how many guests? <span className="zai-req">*</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              placeholder="e.g. 300"
            />
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <fieldset className="zai-intake__field">
            <legend>
              Which services do you need? <span className="zai-req">*</span>
            </legend>
            <div className="zai-intake__pills">
              {agents.map((a) => {
                const on = services.includes(a.slug)
                return (
                  <button
                    key={a.slug}
                    type="button"
                    aria-pressed={on}
                    className={on ? 'is-on' : ''}
                    onClick={() => toggleService(a.slug)}
                  >
                    {a.emoji} {a.service}
                  </button>
                )
              })}
              <button
                type="button"
                aria-pressed={complete}
                className={`zai-intake__complete ${complete ? 'is-on' : ''}`}
                onClick={() => toggleService(COMPLETE_PLANNING)}
              >
                ✦ {COMPLETE_PLANNING_LABEL}
              </button>
            </div>
          </fieldset>
          <label className="zai-intake__field">
            <span>Anything else? Other services (car, makeup, invitations…) or details</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1500} />
          </label>

          {editContact ? (
            <div className="zai-intake__row">
              <label className="zai-intake__field">
                <span>
                  Your name <span className="zai-req">*</span>
                </span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
              </label>
              <label className="zai-intake__field">
                <span>
                  Mobile number <span className="zai-req">*</span>
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="10-digit mobile"
                  maxLength={16}
                />
              </label>
            </div>
          ) : (
            <p className="zai-intake__known">
              Is this you? <strong>{name}</strong> · {phone}{' '}
              <button type="button" onClick={() => setEditContact(true)}>
                Change
              </button>
            </p>
          )}
          <input
            className="zai-hp"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            name="company"
          />
          <label className="zai-intake__consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Zenfest Events may call or WhatsApp me about this event. <span className="zai-req">*</span>
            </span>
          </label>
        </>
      )}

      {step === 3 && (
        <div className="zai-intake__confirm">
          <p>We’ll assign your request to our specialists:</p>
          <ul className="zai-intake__assigned">
            {assigned.map((a) => (
              <li key={a.slug}>
                <span aria-hidden="true">{a.emoji}</span> <strong>{a.name}</strong> — {a.service}
              </li>
            ))}
          </ul>
          {notChosen.length > 0 && (
            <>
              <p>Would you like to add any other services before we prepare your quote?</p>
              <div className="zai-intake__pills">
                {notChosen.map((a) => (
                  <button key={a.slug} type="button" onClick={() => toggleService(a.slug)}>
                    + {a.emoji} {a.service}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="zai-intake__hint">It’s just a quote — feel free to compare it with other vendors.</p>
        </div>
      )}

      {error && (
        <p className="zai-intake__error" role="alert">
          {error}
        </p>
      )}
      <div className="zai-intake__nav">
        {step > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => go(step - 1)}>
            Back
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {step < 3 ? 'Next' : busy ? 'Preparing…' : 'Get my quote'}
        </button>
      </div>
    </form>
  )
}
