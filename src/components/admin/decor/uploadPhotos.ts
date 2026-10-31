// Browser-only helpers for decoration photos (used by AddPhotos and QuickAdd).
//
// Phone camera photos are 5–12 MB, and Vercel refuses any request over ~4.5 MB, so the
// admin's own upload failed with a bare "Failed to upload". Here the phone itself shrinks
// each photo to at most 2560 px on the long edge (owner, 2026-10-31) at high JPEG quality
// (~1–2 MB) before uploading. That is sharper than any phone or laptop screen. Re-encoding
// also drops the photo's EXIF data, so a supplier's GPS location never reaches the site.
// The server then saves a WebP master and the thumbnail / card / large copies
// (collections/DecorPhotos.ts).

/** Longest side of the photo we upload, in pixels. Matches DecorPhotos' resizeOptions. */
export const MAX_EDGE = 2560
/** Stay well under Vercel's 4.5 MB request limit (the server also refuses over 4 MB). */
const MAX_UPLOAD_BYTES = 3.8 * 1024 * 1024
const QUALITIES = [0.9, 0.82, 0.74]

export type UploadedPhoto = { id: number; thumb: string }

/** Thrown with a sentence a team member can act on. */
export class PhotoError extends Error {}

/** Decodes a picked file, honouring the camera's rotation. */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  } catch {
    // Older Safari: fall back to an <img>, which also applies the rotation.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      return { source: img, width: img.naturalWidth, height: img.naturalHeight }
    } catch {
      throw new PhotoError(`“${file.name}” couldn’t be opened. Try another photo, or take a screenshot of it.`)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

/**
 * A photo ready to upload: at most MAX_EDGE px on the long edge (never enlarged), JPEG,
 * under 3.8 MB. Transparent areas (PNG) become white.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const img = await decode(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('This browser can’t prepare photos. Try Chrome or Safari.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img.source, 0, 0, width, height)
  img.close?.()
  try {
    for (const q of QUALITIES) {
      const blob = await toBlob(canvas, q)
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob
    }
  } finally {
    // Free the pixels at once: a phone may hold several 2560 px canvases otherwise.
    canvas.width = 0
    canvas.height = 0
  }
  throw new PhotoError(`“${file.name}” is still too large after shrinking. Try another photo.`)
}

const messageFrom = async (res: Response) => {
  try {
    const data = await res.json()
    return data?.errors?.[0]?.message || data?.message || ''
  } catch {
    return ''
  }
}

/** Shrinks and uploads one photo to the Decor photos list; returns its id and thumbnail. */
export async function uploadDecorPhoto(file: File): Promise<UploadedPhoto> {
  const blob = await shrinkPhoto(file)
  const form = new FormData()
  // The server gives the file a random name anyway (DecorPhotos' beforeOperation).
  form.append('file', blob, 'photo.jpg')
  form.append('_payload', JSON.stringify({}))
  let res: Response
  try {
    res = await fetch('/api/decor-photos', { method: 'POST', body: form, credentials: 'same-origin' })
  } catch {
    throw new PhotoError('No internet connection. Check your signal and try again.')
  }
  if (res.status === 401 || res.status === 403) throw new PhotoError('Please log in to the admin again, then retry.')
  if (!res.ok) throw new PhotoError((await messageFrom(res)) || `Upload failed (error ${res.status}). Try again.`)
  const data = await res.json()
  const doc = data?.doc
  if (!doc?.id) throw new PhotoError('Upload failed. Try again.')
  const thumb = doc.sizes?.thumbnail?.url || doc.thumbnailURL || doc.url || ''
  return { id: doc.id, thumb: String(thumb).replace(/^https?:\/\/[^/]+(?=\/api\/)/, '') }
}

/**
 * Uploads photos one after another (one at a time keeps a phone's memory low), reporting
 * progress. Photos that fail are reported and skipped; the rest still upload.
 */
export async function uploadDecorPhotos(
  files: File[],
  onProgress: (done: number, total: number) => void,
): Promise<{ uploaded: UploadedPhoto[]; errors: string[] }> {
  const uploaded: UploadedPhoto[] = []
  const errors: string[] = []
  onProgress(0, files.length)
  for (let i = 0; i < files.length; i++) {
    try {
      uploaded.push(await uploadDecorPhoto(files[i]))
    } catch (err) {
      errors.push(err instanceof PhotoError ? err.message : `“${files[i].name}” failed to upload. Try again.`)
    }
    onProgress(i + 1, files.length)
  }
  return { uploaded, errors }
}
