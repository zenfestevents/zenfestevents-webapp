import React from 'react'
import type { DefaultServerCellComponentProps } from 'payload'

import { mediaUrl } from '../../../lib/media'

/**
 * Decorations list: the cover photo (first photo) as a small thumbnail, linking to the
 * item. A server component, so it reads the photo record directly (lists load at depth 0).
 */
export async function DecorCoverCell({ cellData, rowData, payload, linkURL }: DefaultServerCellComponentProps) {
  const first = Array.isArray(cellData) ? cellData[0] : null
  const id = first && typeof first === 'object' ? (first as { id?: number }).id : first
  const href = linkURL || `/admin/collections/decor-items/${rowData?.id}`
  let src = ''
  if (id != null) {
    const photo = await payload
      .findByID({ collection: 'decor-photos', id: id as number, depth: 0, overrideAccess: true })
      .catch(() => null)
    src = photo ? mediaUrl(photo as never, 'thumbnail') : ''
  }
  const count = Array.isArray(cellData) ? cellData.length : 0
  return (
    <a href={href} className="zf-decor-cover" title="Open">
      {src ? (
        // Plain <img> as elsewhere in the admin: next/image only allows /api/media/file/**.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={56} height={56} loading="lazy" />
      ) : (
        <span className="zf-decor-cover__none">No photo</span>
      )}
      {count > 1 ? <span className="zf-decor-cover__count">+{count - 1}</span> : null}
    </a>
  )
}
