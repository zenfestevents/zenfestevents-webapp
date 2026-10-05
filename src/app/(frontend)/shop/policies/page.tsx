import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { getSiteSettings } from '../../../../lib/getSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shop policies — buying, delivery, returns and complaints',
  description: 'How buying works in the Zenfest Shop: partner stores, Zenfest sellers, delivery, returns and our grievance officer.',
}

/**
 * Shown on the policies page as required by the Consumer Protection (E-Commerce)
 * Rules. Fill in the officer's name before the shop takes seller orders.
 */
const GRIEVANCE_OFFICER = { name: 'Grievance Officer, Zenfest Events', designation: 'Customer care' }

export default async function ShopPoliciesPage() {
  const settings = await getSiteSettings()
  const email = settings.contact?.email || 'zenfestevents@gmail.com'
  const phone = settings.contact?.phonePrimary || ''
  const address = settings.branches?.[0]

  return (
    <section className="section">
      <div className="container sp-policy">
        <header className="page-head">
          <p className="eyebrow">
            <Link href="/shop">Zenfest Shop</Link>
          </p>
          <h1 className="display-l">Shop policies</h1>
          <p className="lede">How buying works, who delivers, how returns work and how to reach us with a complaint.</p>
        </header>

        <h2 className="display-m">Who you are buying from</h2>
        <p>
          Zenfest Events runs the Zenfest Shop as a platform. Zenfest does not sell the products itself. Every product
          page shows who sells it:
        </p>
        <ul>
          <li>
            <strong>Partner store</strong> (for example Amazon, Flipkart or Ferns N Petals). You buy on their website;
            their price, delivery, returns and invoice apply. When you buy through our link, Zenfest may earn a small
            commission from the store at no extra cost to you.
          </li>
          <li>
            <strong>Zenfest seller</strong> — an independent business reviewed by our team. The seller sets the price,
            ships the product, issues the invoice and handles returns as described on the product page. Sellers who ship
            to other states show their GSTIN.
          </li>
        </ul>

        <h2 className="display-m">Prices and payment</h2>
        <p>
          Prices are in Indian rupees. Partner-store prices can change on their site; the price at their checkout
          applies. For Zenfest sellers, you pay the seller directly using the payment details they share for your order.
          Zenfest never asks for card numbers, OTPs or passwords.
        </p>

        <h2 className="display-m">Delivery</h2>
        <p>
          Each product page shows where it can be delivered and how soon it ships. Partner stores deliver according to
          their own terms. Zenfest sellers share a tracking number once the order ships.
        </p>

        <h2 className="display-m">Returns, refunds and cancellations</h2>
        <p>
          Partner-store purchases follow that store&apos;s return policy. For Zenfest sellers, the returns and refund
          terms are shown on the product page before you order. Personalised and made-to-order items (for example
          name-printed return gifts) usually can&apos;t be returned unless they arrive damaged or wrong — tell the seller
          within 48 hours of delivery with photos.
        </p>

        <h2 className="display-m">Gift registry</h2>
        <p>
          Products added to a gift registry are bought by guests the same way as above. Zenfest only keeps track of which
          gifts are claimed so guests don&apos;t buy the same thing twice.
        </p>

        <h2 className="display-m" id="grievance">
          Complaints and grievance officer
        </h2>
        <p>
          If something goes wrong with an order, contact the seller first. If it isn&apos;t sorted, or your complaint is
          about Zenfest, write to our grievance officer. We acknowledge every complaint within 48 hours and aim to
          resolve it within one month.
        </p>
        <address className="sp-policy__officer card">
          <strong>{GRIEVANCE_OFFICER.name}</strong>
          <span>{GRIEVANCE_OFFICER.designation}</span>
          <a href={`mailto:${email}`}>{email}</a>
          {phone && <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>}
          {address?.addressLine && <span>{address.addressLine}</span>}
        </address>

        <h2 className="display-m">Selling on Zenfest</h2>
        <p>
          Event businesses can list products for free. Listings go live after our team reviews them. Zenfest charges
          sellers a commission on delivered orders, agreed before the first listing goes live. Sellers are responsible
          for their own GST, invoices, delivery and returns. <Link href="/vendors">Become a seller</Link>
        </p>
      </div>
    </section>
  )
}
