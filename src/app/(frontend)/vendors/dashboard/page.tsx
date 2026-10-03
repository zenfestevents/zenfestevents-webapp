import React from 'react'
import type { Metadata } from 'next'

import { param, type SearchParams } from '../../../../components/market/AuthShell'
import { VendorDashboard, type DashboardVendor } from '../../../../components/market/VendorDashboard'
import { dayKey, enquiriesForVendor, photo, type PublicPhoto } from '../../../../lib/marketplace'
import { getPayloadClient } from '../../../../lib/payload'
import { verifyMode } from '../../../../lib/phoneVerification'
import { requireVendor } from '../../../../lib/session'
import type { Vendor } from '../../../../payload-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Vendor dashboard', robots: { index: false } }

export default async function VendorDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const session = await requireVendor('/vendors/dashboard')
  const payload = await getPayloadClient()
  const v = (await payload.findByID({
    collection: 'vendors',
    id: session.id,
    depth: 1,
    overrideAccess: true,
  })) as Vendor
  const { docs: library } = await payload.find({
    collection: 'vendor-media',
    where: { vendor: { equals: v.id } },
    sort: '-createdAt',
    depth: 0,
    limit: 60,
    overrideAccess: true,
  })

  const gallery = (v.gallery ?? []).map(photo).filter((p): p is PublicPhoto => Boolean(p))
  const inGallery = new Set(gallery.map((p) => p.id))
  const vendor: DashboardVendor = {
    id: v.id,
    name: v.name,
    businessName: v.businessName,
    slug: v.slug,
    email: v.email,
    phone: v.phone,
    phoneVerified: Boolean(v.phoneVerified),
    category: v.category,
    otherService: v.otherService ?? '',
    areas: v.areas ?? [],
    about: v.about ?? '',
    instagram: v.instagram ?? '',
    languages: v.languages ?? [],
    priceCard: (v.priceCard ?? []).map((r) => ({
      item: r.item,
      unit: r.unit,
      price: r.price,
      gstIncluded: r.gstIncluded !== false,
      note: r.note ?? '',
    })),
    gallery,
    // Uploaded but not (yet) shown on the listing.
    spare: library.map(photo).filter((p): p is PublicPhoto => Boolean(p) && !inGallery.has(p!.id)),
    coverId: v.cover && typeof v.cover === 'object' ? v.cover.id : (v.cover ?? null),
    blockedDates: (v.blockedDates ?? []).map((b) => ({ date: dayKey(b.date), note: b.note ?? '' })),
    listingStatus: v.listingStatus,
    reviewNote: v.reviewNote ?? '',
    hasApplication: Boolean(v.application),
  }

  return (
    <VendorDashboard
      vendor={vendor}
      enquiries={await enquiriesForVendor(v.id)}
      verifyMode={verifyMode()}
      initialTab={param(sp.tab)}
      welcome={param(sp.welcome) === '1'}
    />
  )
}
