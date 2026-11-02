'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields, useRowLabel } from '@payloadcms/ui'

import { rupees } from '../../../lib/decorOptions'

type Supplier = { id: number; name: string; area?: string | null }

/** One fetch of the suppliers list per page: the row labels read names and areas from it. */
let cache: Promise<Record<string, Supplier>> | null = null
const loadSuppliers = () => {
  cache ??= fetch('/api/decor-suppliers?limit=500&depth=0&select[name]=true&select[area]=true', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : { docs: [] }))
    .then((d: { docs?: Supplier[] }) => Object.fromEntries((d.docs ?? []).map((s) => [String(s.id), s])))
    .catch(() => {
      cache = null
      return {}
    })
  return cache
}

/**
 * The title of each row in a decoration's "Supplier prices": who, where, what they charge and
 * what is left of the client price, so the team can compare suppliers at a glance:
 * "Gurdwara Decors · Gurdwara · ₹8,000 · margin ₹4,000".
 */
export function SupplierRowLabel() {
  const { data, rowNumber } = useRowLabel<{ supplier?: number | { id: number } | null; price?: number | null }>()
  const clientPrice = useFormFields(([fields]) => Number(fields.clientPrice?.value ?? NaN))
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({})
  useEffect(() => {
    let live = true
    loadSuppliers().then((s) => live && setSuppliers(s))
    return () => {
      live = false
    }
  }, [])

  const id = data?.supplier && typeof data.supplier === 'object' ? data.supplier.id : data?.supplier
  const supplier = id != null ? suppliers[String(id)] : undefined
  const price = data?.price != null ? Number(data.price) : NaN
  const parts = [
    supplier ? supplier.name : `Supplier ${(rowNumber ?? 0) + 1}`,
    supplier?.area || '',
    Number.isFinite(price) ? rupees(price) : '',
    Number.isFinite(price) && Number.isFinite(clientPrice) ? `margin ${rupees(clientPrice - price)}` : '',
  ].filter(Boolean)
  return <span>{parts.join(' · ')}</span>
}
