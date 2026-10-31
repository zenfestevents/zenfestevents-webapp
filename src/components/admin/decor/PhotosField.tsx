'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'

import { uploadDecorPhotos } from './uploadPhotos'

type Ref = number | string | { id?: number | string; value?: number | string } | null

const idOf = (v: Ref): number | null => {
  const id = v && typeof v === 'object' ? (v.id ?? v.value) : v
  return id == null || id === '' ? null : Number(id)
}

const relative = (url: string) => url.replace(/^https?:\/\/[^/]+(?=\/api\/)/, '')

/**
 * The Photos field on a decoration, replacing Payload's own upload box (whose "Create New"
 * sends the camera file as it is and fails on phone photos over ~4.5 MB). One button adds
 * photos, shrunk on the phone first (uploadPhotos.ts); the thumbnails underneath show the
 * cover first, with "Make cover" and remove on each.
 */
export function DecorPhotosField({ path = 'photos' }: { path?: string }) {
  const { value, setValue, showError, errorMessage } = useField<Ref[] | null>({ path })
  const ids = (Array.isArray(value) ? value : []).map(idOf).filter((x): x is number => x != null)
  const input = useRef<HTMLInputElement>(null)
  const [thumbs, setThumbs] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [added, setAdded] = useState(0)

  // Thumbnails for photos already on the decoration (staff can read decor-photos).
  const missing = ids.filter((id) => !(id in thumbs))
  const missingKey = missing.join(',')
  useEffect(() => {
    if (!missingKey) return
    let live = true
    fetch(`/api/decor-photos?where[id][in]=${missingKey}&depth=0&limit=100`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((d: { docs?: { id: number; url?: string; sizes?: { thumbnail?: { url?: string } } }[] }) => {
        if (!live) return
        const next: Record<number, string> = {}
        for (const doc of d.docs ?? []) next[doc.id] = relative(doc.sizes?.thumbnail?.url || doc.url || '')
        setThumbs((t) => ({ ...t, ...next }))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [missingKey])

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setErrors([])
    setAdded(0)
    const result = await uploadDecorPhotos(Array.from(files), (done, total) =>
      setBusy(done < total ? `Uploading ${done + 1} of ${total}…` : ''),
    )
    setBusy('')
    if (input.current) input.current.value = ''
    if (result.uploaded.length) {
      setThumbs((t) => ({ ...t, ...Object.fromEntries(result.uploaded.map((p) => [p.id, p.thumb])) }))
      setValue([...ids, ...result.uploaded.map((p) => p.id)])
      setAdded(result.uploaded.length)
    }
    setErrors(result.errors)
  }

  const makeCover = (id: number) => setValue([id, ...ids.filter((x) => x !== id)])
  const remove = (id: number) => setValue(ids.filter((x) => x !== id))

  return (
    <div className={`field-type zf-photos${showError ? ' error' : ''}`}>
      <label className="field-label" htmlFor={`field-${path}`}>
        Photos
      </label>

      {ids.length ? (
        <ul className="zf-photos__grid">
          {ids.map((id, i) => (
            <li key={id} className={i === 0 ? 'zf-photos__item zf-photos__item--cover' : 'zf-photos__item'}>
              {thumbs[id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[id]} alt="" width={120} height={120} loading="lazy" />
              ) : (
                <span className="zf-photos__loading" aria-hidden />
              )}
              {i === 0 ? (
                <span className="zf-photos__badge">Cover</span>
              ) : (
                <button type="button" className="zf-photos__cover" onClick={() => makeCover(id)}>
                  Make cover
                </button>
              )}
              <button type="button" className="zf-photos__remove" aria-label="Remove photo" onClick={() => remove(id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        id={`field-${path}`}
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <button
        type="button"
        className="btn btn--style-primary btn--size-medium zf-photos__add"
        disabled={Boolean(busy)}
        onClick={() => input.current?.click()}
      >
        {busy || (ids.length ? '＋ Add more photos' : '＋ Add photos')}
      </button>
      <p className="zf-photos__hint">
        Take a photo or pick from your gallery: it is prepared on your phone in high quality and uploads in a second or
        two. The first photo is the cover. Press <strong>Save</strong> when you’re done.
      </p>
      {added ? (
        <p className="zf-photos__ok" role="status">
          Added {added} photo{added > 1 ? 's' : ''}. Press Save to keep {added > 1 ? 'them' : 'it'}.
        </p>
      ) : null}
      {errors.length || (showError && errorMessage) ? (
        <ul className="zf-photos__errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
          {showError && errorMessage ? <li>{errorMessage}</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
