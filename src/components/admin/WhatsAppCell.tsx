'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

import { whatsappLink } from '../../lib/site'

/**
 * Admin list cell: shows a phone number as a "Chat on WhatsApp" link. Ten-digit
 * Indian numbers get the 91 country code that wa.me needs.
 */
export function WhatsAppCell({ cellData }: DefaultCellComponentProps) {
  const raw = typeof cellData === 'string' ? cellData : ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return <span>—</span>
  const full = digits.length === 10 ? `91${digits}` : digits
  return (
    <a
      href={whatsappLink(full, 'Hi! This is Zenfest Events — thanks for reaching out about your celebration.')}
      target="_blank"
      rel="noopener"
      onClick={(e) => e.stopPropagation()}
      style={{ color: '#1eae5a', fontWeight: 600, whiteSpace: 'nowrap' }}
    >
      {raw} · WhatsApp
    </a>
  )
}
