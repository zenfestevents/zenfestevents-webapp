'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { checkSlug, createRegistry, type CreateRegistryInput } from '../../app/(frontend)/registry/actions'
import { REGISTRY_EVENT_TYPES, SLUG_PATTERN, slugify } from '../../lib/registryOptions'

const STEPS = ['The occasion', 'Where', 'Your details'] as const

const EMPTY: CreateRegistryInput = {
  title: '',
  eventType: 'wedding',
  hostNames: '',
  eventDate: '',
  venueName: '',
  venueCity: '',
  venueMapUrl: '',
  welcomeNote: '',
  hostName: '',
  hostPhone: '',
  hostEmail: '',
  slug: '',
  company: '',
}

/** Three short steps; the registry goes live on submit and opens the dashboard. */
export function CreateRegistryForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<CreateRegistryInput>(EMPTY)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [checked, setChecked] = useState<{ slug: string; available: boolean } | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const set = (k: keyof CreateRegistryInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }))

  // Suggest an address from the names + year until the host edits it.
  const year = date ? date.slice(0, 4) : ''
  const base = slugify(data.hostNames || data.title)
  const slug = slugTouched ? data.slug : base ? slugify(`${base}${year ? `-${year}` : ''}`) : ''

  const slugState: 'idle' | 'checking' | 'free' | 'taken' | 'invalid' = !slug
    ? 'idle'
    : !SLUG_PATTERN.test(slug)
      ? 'invalid'
      : checked?.slug === slug
        ? checked.available
          ? 'free'
          : 'taken'
        : 'checking'

  // Debounced availability check.
  useEffect(() => {
    if (!SLUG_PATTERN.test(slug)) return
    let live = true
    const t = setTimeout(async () => {
      const { available } = await checkSlug(slug)
      if (live) setChecked({ slug, available })
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [slug])

  function next(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity()
      return
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      window.scrollTo({ top: formRef.current?.offsetTop ? formRef.current.offsetTop - 120 : 0 })
      return
    }
    submit()
  }

  async function submit() {
    if (slugState === 'taken' || slugState === 'invalid') {
      setError('Choose a different page address.')
      return
    }
    setSending(true)
    const eventDate = new Date(`${date}T${time || '00:00'}:00+05:30`).toISOString()
    const res = await createRegistry({ ...data, slug, eventDate })
    if (!res.ok) {
      setSending(false)
      setError(res.error)
      return
    }
    router.push(`/dashboard/${res.slug}?key=${encodeURIComponent(res.key)}&new=1`)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <form ref={formRef} className="form reg-create" onSubmit={next} noValidate={false}>
      <ol className="reg-steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span>{i + 1}</span> {s}
          </li>
        ))}
      </ol>
      <input
        type="text"
        name="company"
        className="hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={data.company}
        onChange={set('company')}
      />

      {step === 0 && (
        <>
          <label className="field">
            <span className="field__label">Occasion *</span>
            <select required value={data.eventType} onChange={set('eventType')}>
              {REGISTRY_EVENT_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Whose celebration? *</span>
            <input
              required
              maxLength={120}
              placeholder="e.g. Rahul & Neha"
              value={data.hostNames}
              onChange={set('hostNames')}
            />
          </label>
          <label className="field">
            <span className="field__label">Registry title *</span>
            <input
              required
              maxLength={120}
              placeholder="e.g. Rahul & Neha’s Wedding"
              value={data.title}
              onChange={set('title')}
            />
          </label>
          <div className="form__row">
            <label className="field">
              <span className="field__label">Date *</span>
              <input type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <label className="field">
            <span className="field__label">Venue</span>
            <input maxLength={160} placeholder="e.g. Sri Lakshmi Mahal" value={data.venueName} onChange={set('venueName')} />
          </label>
          <label className="field">
            <span className="field__label">City *</span>
            <input required maxLength={80} placeholder="e.g. Chennai" value={data.venueCity} onChange={set('venueCity')} />
          </label>
          <label className="field">
            <span className="field__label">Google Maps link</span>
            <input
              type="url"
              maxLength={2000}
              placeholder="https://maps.app.goo.gl/…"
              value={data.venueMapUrl}
              onChange={set('venueMapUrl')}
            />
            <span className="field__hint">In Google Maps: Share → Copy link.</span>
          </label>
          <label className="field">
            <span className="field__label">A note for your guests</span>
            <textarea
              rows={3}
              maxLength={800}
              placeholder="Your presence is the real gift — but if you’d like to bless us with something, here are a few ideas."
              value={data.welcomeNote}
              onChange={set('welcomeNote')}
            />
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <div className="form__row">
            <label className="field">
              <span className="field__label">Your name *</span>
              <input required maxLength={120} autoComplete="name" value={data.hostName} onChange={set('hostName')} />
            </label>
            <label className="field">
              <span className="field__label">Mobile / WhatsApp *</span>
              <input
                required
                type="tel"
                inputMode="tel"
                pattern="[+0-9 \-]{10,16}"
                autoComplete="tel"
                value={data.hostPhone}
                onChange={set('hostPhone')}
              />
            </label>
          </div>
          <label className="field">
            <span className="field__label">Email</span>
            <input type="email" autoComplete="email" value={data.hostEmail} onChange={set('hostEmail')} />
            <span className="field__hint">We’ll email your private manage link so you never lose it.</span>
          </label>
          <label className="field">
            <span className="field__label">Your page address *</span>
            <div className="reg-slug">
              <span className="reg-slug__prefix">zenfestevents.in/r/</span>
              <input
                required
                maxLength={40}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setData((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
                }}
              />
            </div>
            <span
              className={`field__hint reg-slug__state reg-slug__state--${slugState}`}
              aria-live="polite"
            >
              {slugState === 'checking' && 'Checking…'}
              {slugState === 'free' && '✓ Available'}
              {slugState === 'taken' && 'Taken — try adding the year or city'}
              {slugState === 'invalid' && '3–40 lowercase letters, numbers and hyphens'}
            </span>
          </label>
        </>
      )}

      {error && <p className="form__error">{error}</p>}

      <div className="btn-row">
        {step > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <button className="btn btn--primary" disabled={sending}>
          {step < STEPS.length - 1 ? 'Next' : sending ? 'Creating…' : 'Create my registry'}
        </button>
      </div>
      {step === STEPS.length - 1 && (
        <p className="field__hint">Free for families. No account needed — you’ll get a private link to manage it.</p>
      )}
    </form>
  )
}
