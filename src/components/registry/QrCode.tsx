'use client'

import QRCode from 'qrcode'
import React, { useEffect, useState } from 'react'

/** Inline SVG QR code for any text (UPI links, registry links). */
export function QrCode({ value, label, size = 168 }: { value: string; label: string; size?: number }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let live = true
    QRCode.toString(value, { type: 'svg', margin: 1 })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(''))
    return () => {
      live = false
    }
  }, [value])

  return (
    <div
      className="reg-qr"
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
