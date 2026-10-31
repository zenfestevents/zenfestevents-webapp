'use client'

import React, { useRef, useState } from 'react'

import {
  DECOR_CATEGORIES,
  DECOR_EVENT_GROUPS,
  LEGACY_EVENT_TYPES,
  eventTypeLabel,
  rupees,
} from '../../../lib/decorOptions'
import { uploadDecorPhotos, type UploadedPhoto } from './uploadPhotos'

type Saved = { id: number; itemCode: string }

const EMPTY = {
  title: '',
  clientPrice: '',
  vendorPrice: '',
  eventType: '',
  eventTypeOther: '',
  category: '',
  categoryOther: '',
}

/**
 * Quick add (phone): photos + prices + event type + category, saved as a Draft decoration.
 * The team fills in the rest later from the Decorations list (or "Finish details").
 * Photos are shrunk on the phone before uploading (uploadPhotos.ts).
 */
export function DecorQuickAddForm() {
  const input = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saved, setSaved] = useState<Saved | null>(null)

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [key]: e.target.value })

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setErrors([])
    const result = await uploadDecorPhotos(Array.from(files), (done, total) =>
      setBusy(done < total ? `Uploading photo ${done + 1} of ${total}…` : ''),
    )
    setBusy('')
    if (input.current) input.current.value = ''
    setPhotos((p) => [...p, ...result.uploaded])
    setErrors(result.errors)
  }

  const problems = () => {
    const out: string[] = []
    if (!photos.length) out.push('Add at least one photo.')
    if (!f.clientPrice || Number(f.clientPrice) <= 0) out.push('Enter the client price.')
    if (!f.eventType) out.push('Choose the event type.')
    if (f.eventType === 'other' && !f.eventTypeOther.trim()) out.push('Type which event.')
    if (!f.category) out.push('Choose the category.')
    if (f.category === 'other' && !f.categoryOther.trim()) out.push('Type which category.')
    return out
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = problems()
    setErrors(p)
    if (p.length) return
    setBusy('Saving…')
    try {
      const res = await fetch('/api/decor-items', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          title: f.title.trim() || undefined,
          photos: photos.map((x) => x.id),
          clientPrice: Number(f.clientPrice),
          vendorPrice: f.vendorPrice ? Number(f.vendorPrice) : undefined,
          eventType: f.eventType,
          eventTypeOther: f.eventType === 'other' ? f.eventTypeOther.trim() : undefined,
          category: f.category,
          categoryOther: f.category === 'other' ? f.categoryOther.trim() : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          data?.errors?.[0]?.data?.errors?.map((x: { message: string }) => x.message).join(' ') ||
          data?.errors?.[0]?.message ||
          `Could not save (error ${res.status}).`
        setErrors([msg])
        return
      }
      setSaved({ id: data.doc.id, itemCode: data.doc.itemCode })
    } catch {
      setErrors(['No internet connection. Check your signal and try again.'])
    } finally {
      setBusy('')
    }
  }

  const again = () => {
    // Keep the event type and category: the team often adds several of the same kind.
    setF({ ...EMPTY, eventType: f.eventType, eventTypeOther: f.eventTypeOther, category: f.category, categoryOther: f.categoryOther })
    setPhotos([])
    setErrors([])
    setSaved(null)
  }

  if (saved) {
    return (
      <div className="zf-quickadd__done" role="status">
        <p className="zf-eyebrow">Saved as a draft</p>
        <p className="zf-quickadd__code">{saved.itemCode}</p>
        <p>
          {eventTypeLabel(f.eventType)} · {rupees(Number(f.clientPrice))}. It is not on the website yet: add a title
          and set Status to Active when it’s ready.
        </p>
        <div className="zf-quickadd__actions">
          <button type="button" className="btn btn--style-primary btn--size-large" onClick={again}>
            Add another
          </button>
          <a className="btn btn--style-secondary btn--size-large" href={`/admin/collections/decor-items/${saved.id}`}>
            Finish details
          </a>
        </div>
      </div>
    )
  }

  return (
    <form className="zf-quickadd" onSubmit={save} noValidate>
      <section className="zf-quickadd__step">
        <h2>1. Photos</h2>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
        {photos.length ? (
          <ul className="zf-quickadd__photos">
            {photos.map((p, i) => (
              <li key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" width={96} height={96} />
                {i === 0 ? <span>Cover</span> : null}
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="btn btn--style-primary btn--size-large zf-quickadd__big"
          disabled={Boolean(busy)}
          onClick={() => input.current?.click()}
        >
          {busy && busy !== 'Saving…' ? busy : photos.length ? '＋ Add more photos' : '📷 Take or pick photos'}
        </button>
      </section>

      <section className="zf-quickadd__step">
        <h2>2. Prices</h2>
        <label>
          <span>Client price ₹ (what we quote)</span>
          <input type="number" inputMode="numeric" min={0} step={500} value={f.clientPrice} onChange={set('clientPrice')} />
        </label>
        <label>
          <span>Vendor price ₹ (team only, optional)</span>
          <input type="number" inputMode="numeric" min={0} step={500} value={f.vendorPrice} onChange={set('vendorPrice')} />
        </label>
      </section>

      <section className="zf-quickadd__step">
        <h2>3. What is it?</h2>
        <label>
          <span>Event type</span>
          <select value={f.eventType} onChange={set('eventType')}>
            <option value="">Choose…</option>
            {DECOR_EVENT_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.values
                  .filter((v) => !LEGACY_EVENT_TYPES.includes(v))
                  .map((v) => (
                    <option key={v} value={v}>
                      {eventTypeLabel(v)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {f.eventType === 'other' ? (
          <label>
            <span>Which event?</span>
            <input type="text" maxLength={80} placeholder="e.g. Corporate annual day" value={f.eventTypeOther} onChange={set('eventTypeOther')} />
          </label>
        ) : null}
        <label>
          <span>Category</span>
          <select value={f.category} onChange={set('category')}>
            <option value="">Choose…</option>
            {DECOR_CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {f.category === 'other' ? (
          <label>
            <span>Which category?</span>
            <input type="text" maxLength={80} placeholder="e.g. Ceiling drapes" value={f.categoryOther} onChange={set('categoryOther')} />
          </label>
        ) : null}
        <label>
          <span>Title (optional, can add later)</span>
          <input type="text" maxLength={140} placeholder="e.g. Peacock stage with jasmine strings" value={f.title} onChange={set('title')} />
        </label>
      </section>

      {errors.length ? (
        <ul className="zf-quickadd__errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <button type="submit" className="btn btn--style-primary btn--size-large zf-quickadd__big" disabled={Boolean(busy)}>
        {busy === 'Saving…' ? busy : 'Save as draft'}
      </button>
    </form>
  )
}
