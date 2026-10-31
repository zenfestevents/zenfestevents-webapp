import React from 'react'
import type { DefaultServerCellComponentProps } from 'payload'

import { marginOf, rupees } from '../../../lib/decorOptions'

/** Decorations list: margin (client − vendor price) in ₹ and %, red when below zero. Staff only. */
export function DecorMarginCell({ rowData }: DefaultServerCellComponentProps) {
  const margin = marginOf(rowData?.clientPrice, rowData?.vendorPrice)
  if (margin == null) return <span>—</span>
  const client = Number(rowData?.clientPrice)
  const pct = client > 0 ? Math.round((margin / client) * 100) : null
  return (
    <span className={margin < 0 ? 'zf-margin zf-margin--loss' : 'zf-margin'}>
      {margin < 0 ? '−' : ''}
      {rupees(Math.abs(margin))}
      {pct != null ? <small> · {pct}%</small> : null}
    </span>
  )
}

/** A price column as "₹1,18,000" (Indian grouping) instead of a bare number. */
export function DecorRupeesCell({ cellData }: DefaultServerCellComponentProps) {
  const n = typeof cellData === 'number' ? cellData : null
  return <span className="zf-rupees">{n == null ? '—' : rupees(n)}</span>
}
