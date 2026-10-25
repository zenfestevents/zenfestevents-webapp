import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { getSiteSettings } from '../../../lib/getSettings'

// A cached page (CLAUDE.md, "Page caching"): rebuilt at most every 5 minutes, at once when /admin saves.
export const revalidate = 300

export const metadata: Metadata = {
  alternates: { canonical: '/privacy' },
  title: 'Privacy policy',
  description:
    'What Zenfest Events collects on its website and WhatsApp, why, who it is shared with, how long it is kept and how to have it corrected or deleted.',
}

/** Bump when the policy changes. */
const UPDATED = '14 October 2026'

/**
 * Required by Meta to publish the WhatsApp app, and by India's DPDP Act. Written
 * from what the site actually does — keep it in step when a feature starts
 * collecting something new (see CLAUDE.md).
 */
export default async function PrivacyPage() {
  const settings = await getSiteSettings()
  const email = settings.contact?.email || 'zenfestevents@gmail.com'
  const phone = settings.contact?.phonePrimary || ''
  const address = settings.branches?.[0]

  return (
    <section className="section">
      <div className="container sp-policy">
        <header className="page-head">
          <p className="eyebrow">Zenfest Events</p>
          <h1 className="display-l">Privacy policy</h1>
          <p className="lede">
            What we collect when you use our website or message us on WhatsApp, why we need it, and how you stay in
            control of it.
          </p>
          <p className="muted">Last updated: {UPDATED}</p>
        </header>

        <h2 className="display-m">Who we are</h2>
        <p>
          Zenfest Events LLP (&ldquo;Zenfest&rdquo;, &ldquo;we&rdquo;) is an event management company in Tamil Nadu, India.
          This policy covers zenfestevents.in, our WhatsApp numbers and the services you reach through them. We are
          responsible for your personal data under India&apos;s Digital Personal Data Protection Act, 2023.
        </p>

        <h2 className="display-m">What we collect</h2>
        <ul>
          <li>
            <strong>When you enquire or plan an event:</strong> your name, phone number, email if you give it, and the
            event details you share (type, dates, place, guest count, budget, services, messages).
          </li>
          <li>
            <strong>When you create an account:</strong> your name and WhatsApp number. Couples may add their area and
            event date. Vendors add their business name, services, areas, prices, photos and availability.
          </li>
          <li>
            <strong>When you message us on WhatsApp:</strong> your WhatsApp number, the profile name WhatsApp shows us,
            the messages and files you send, and whether our messages were delivered and read.
          </li>
          <li>
            <strong>When you verify your number:</strong> the code you send us on WhatsApp, which only proves the number
            is yours.
          </li>
          <li>
            <strong>Other features you choose to use:</strong> chats with our Zenfest AI planner, gift registries and
            guest lists, and poll votes.
          </li>
          <li>
            <strong>Technical data:</strong> a login cookie that keeps you signed in, and basic server logs (such as IP
            address and time) used to keep the site secure. We do not use advertising or tracking cookies.
          </li>
        </ul>

        <h2 className="display-m">Why we use it</h2>
        <ul>
          <li>To reply to you, plan and quote your event, and deliver the services you book.</li>
          <li>To run your account and verify that the phone number is really yours.</li>
          <li>To connect couples with the vendors they choose to contact.</li>
          <li>
            To send event updates and offers on WhatsApp, <strong>only if you agreed to receive them</strong>. Reply{' '}
            <strong>STOP</strong> at any time and we stop; reply START to opt back in.
          </li>
          <li>To keep the site safe, prevent fraud and spam, and meet our legal obligations.</li>
        </ul>
        <p>
          We use your data because you gave it to us for these purposes or agreed to them. You can withdraw your consent
          at any time (see &ldquo;Your rights&rdquo;).
        </p>

        <h2 className="display-m">WhatsApp</h2>
        <p>
          We use the WhatsApp Business Platform from Meta to send and receive messages. Messages pass through
          Meta&apos;s systems under WhatsApp&apos;s own terms and privacy policy. Our team, and automated replies we set
          up for our business, read and answer messages sent to our WhatsApp numbers. We never ask for card numbers,
          OTPs or passwords on WhatsApp.
        </p>

        <h2 className="display-m">Who we share it with</h2>
        <p>We do not sell your personal data. We share it only as follows:</p>
        <ul>
          <li>
            <strong>Vendors you contact:</strong> when a couple sends an enquiry, that vendor sees their name, phone
            number and event details. A couple sees a vendor&apos;s phone number after the vendor replies.
          </li>
          <li>
            <strong>Service providers who run the site for us:</strong> Meta (WhatsApp messaging), Vercel (website
            hosting and file storage), Neon (database), our email provider, Airtable (vendor applications) and our AI
            model provider (Zenfest AI chats). They may only use the data to provide their service to us.
          </li>
          <li>
            <strong>When the law requires it:</strong> for example, to answer a lawful request from the authorities.
          </li>
        </ul>
        <p>Some of these providers store data outside India, with safeguards required by Indian law.</p>

        <h2 className="display-m">How long we keep it</h2>
        <p>
          We keep your data while you have an account or an open enquiry, and afterwards only as long as we need it for
          the purposes above (for example, to send you a reminder you asked for) or as the law requires. Verification
          codes expire in 10 minutes. When we no longer need your data, we delete it.
        </p>

        <h2 className="display-m" id="your-rights">
          Your rights
        </h2>
        <ul>
          <li>Ask what personal data we hold about you and how we use it.</li>
          <li>Correct or update it. Account holders can edit most details on their dashboard.</li>
          <li>Withdraw your consent, including to WhatsApp offers (reply STOP).</li>
          <li>Have your data deleted.</li>
          <li>Nominate someone to exercise these rights for you.</li>
          <li>Complain to us, and if you are not satisfied, to the Data Protection Board of India.</li>
        </ul>

        <h2 className="display-m" id="delete">
          How to delete your data
        </h2>
        <p>
          Send a message to us on WhatsApp or email <a href={`mailto:${email}`}>{email}</a> from the number or address
          you used with us, saying &ldquo;Delete my data&rdquo;. We confirm it is you, delete your account, enquiries and
          WhatsApp messages within 30 days, and tell you when it is done. We may keep a small record where the law
          requires it (for example, invoices).
        </p>

        <h2 className="display-m">Security</h2>
        <p>
          The site uses HTTPS, only our team can see your enquiries and messages, and verification codes work once.
          No system is perfectly secure; if a breach affects you, we will tell you and the authorities as the law
          requires.
        </p>

        <h2 className="display-m">Children</h2>
        <p>
          Our services are for adults planning events. We do not knowingly collect data from children under 18 without
          a parent&apos;s consent.
        </p>

        <h2 className="display-m">Changes</h2>
        <p>
          If we change this policy, we update the date at the top. For important changes, we will tell account holders.
        </p>

        <h2 className="display-m" id="contact">
          Contact and grievances
        </h2>
        <p>Questions, requests or complaints about your data:</p>
        <address className="sp-policy__officer card">
          <strong>Grievance Officer, Zenfest Events LLP</strong>
          <a href={`mailto:${email}`}>{email}</a>
          {phone && <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>}
          {address?.addressLine && <span>{address.addressLine}</span>}
        </address>
        <p>
          We acknowledge every request within 48 hours and resolve it within 30 days. See also our{' '}
          <Link href="/shop/policies">shop policies</Link>.
        </p>
      </div>
    </section>
  )
}
