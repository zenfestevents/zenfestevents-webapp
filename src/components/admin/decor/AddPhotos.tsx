'use client'

import React, { useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'

import { uploadDecorPhotos } from './uploadPhotos'

type Ref = number | string | { id?: number | string; value?: number | string } | null

const idOf = (v: Ref) => (v && typeof v === 'object' ? (v.id ?? v.value) : v)

/**
 * Under the Photos field on a decoration: "Add photos" opens the phone's camera or gallery,
 * shrinks each photo on the phone (uploadPhotos.ts) and adds it to the field. Payload's own
 * list above it still reorders (first = cover) and removes photos.
 */
export function DecorAddPhotos({ path = 'photos' }: { path?: string }) {
  const { value, setValue } = useField<Ref[] | null>({ path })
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [added, setAdded] = useState(0)

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setErrors([])
    setAdded(0)
    const list = Array.from(files)
    const result = await uploadDecorPhotos(list, (done, total) =>
      setBusy(done < total ? `Uploading ${done + 1} of ${total}…` : ''),
    )
    setBusy('')
    if (input.current) input.current.value = ''
    if (result.uploaded.length) {
      const current = (Array.isArray(value) ? value : []).map(idOf).filter((x) => x != null)
      setValue([...current, ...result.uploaded.map((p) => p.id)])
      setAdded(result.uploaded.length)
    }
    setErrors(result.errors)
  }

  return (
    <div className="zf-addphotos">
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <button
        type="button"
        className="btn btn--style-primary btn--size-medium zf-addphotos__btn"
        disabled={Boolean(busy)}
        onClick={() => input.current?.click()}
      >
        {busy || '＋ Add photos'}
      </button>
      <p className="zf-addphotos__hint">
        Take a photo or pick from your gallery. Photos are prepared on your phone in high quality and upload in a
        second or two. Remember to press <strong>Save</strong>.
      </p>
      {added ? (
        <p className="zf-addphotos__ok" role="status">
          Added {added} photo{added > 1 ? 's' : ''}. Press Save to keep {added > 1 ? 'them' : 'it'}.
        </p>
      ) : null}
      {errors.length ? (
        <ul className="zf-addphotos__errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
