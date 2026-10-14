# Zenfest "Occasion Reminders" — Internal Platform Plan

## Context
Zenfest Events wants an **internal, staff-only** system that turns every known date of a person (birthday, wedding, anniversary, child's birthday, corporate annual day…) into a **yearly sales opportunity**. A few days before each recurrence, the team pitches on WhatsApp, e.g. "Your 1st wedding anniversary is on 9 Oct. Shall we plan a surprise?".
- **Audience:** past clients (repeat business) and unconverted leads (second chance to convert).
- **Where the data comes from today:** mostly the owner's phone contacts, WhatsApp chats, cold calls and an existing list of past events. No CRM is in use.
- **Website data:** the website (`zenfestevents_webapp`) is early-stage and its current data is dummy. Later it will also feed contacts, tagged as *less trusted*.
- **Scale:** under 2,000 contacts, 1–5 staff.

**Decision:** build it **inside the existing `zenfestevents_webapp` Payload `/admin`**. That panel is already staff-only, because `isAdmin` in `src/access/index.ts` checks `users`, so customers never see it. It already has Postgres on Neon, Vercel hosting, SMTP email, the WhatsApp Cloud API env vars, a `whatsappLink` helper and `Leads`/`Signups` collections with dates. A separate app would duplicate all of this.

**Sending:** start **free**: staff click a pre-filled `wa.me` link and send from the normal WhatsApp Business number. **Later**, turn on Cloud API auto-send (≈₹1/message, about ₹250/month at this scale) for low-touch contacts.

## Research: what already exists, and what we borrow
| Product | What they do | Idea we use |
|---|---|---|
| Dubb, OnePageCRM, Ragic, CiviCRM | Date field on contact + a yearly trigger that matches month and day, firing N days early | Core engine: `nextOccurrence` + lead time |
| AllClients "Birthday Assistant" | Tiers: VIP → staff task 14 days early for a personal call; regular → automated message; low → ignored | `tier` field drives manual vs auto |
| Zapier anniversary templates | Staged touches at 30 days, 14 days and on the day | Lead time per occasion type, plus an optional on-day wish |
| AiSensy, Interakt/WATI via HelloLeads | Daily job sends an approved WhatsApp template to contacts whose date is today; offer messages must be **Marketing** category | Phase 3 auto-send |
| Monica (open-source personal CRM) | Birthdays, anniversaries, "keep in touch" reminders | Simple "upcoming" UX |
| Wedding-vendor playbooks | 1st-anniversary note, vow-renewal offers, VIP segment, track repeat-booking rate | Message copy + conversion report |

**Why build instead of buy:** these tools handle "birthday of a contact". They don't handle "Nth anniversary of an event we did" for a lead/client pipeline with team follow-up and booking tracking. Your stack already has most of the pieces needed.

## How the flow works (end to end)
1. **Capture.** Every person goes into **Contacts**, deduplicated by phone, with one or more **Occasions** (type, whose occasion, original date, whether the year is known). Contacts come in three ways:
   - **Quick Add** by staff after a WhatsApp chat or call (the main path). Tagged with the correct source, `verified = true`.
   - **CSV import** of the existing event list. Tagged `import`, `verified = true`.
   - **Website** `Leads`/`Signups`, through hooks that create the contact automatically. Tagged `website`, `verified = false`, waiting for staff review. This is **switched off** by a setting until the site has real data.
2. **Daily job.** Every day at 09:00 IST a Vercel Cron runs. For each active occasion whose next occurrence is within its lead time, and has no reminder yet for that year, it creates a **Reminder** task. The task holds the occurrence date, the Nth year, a pre-filled message and an assigned staff member. It then emails a digest to the team.
3. **Act.** Staff open **Upcoming Occasions** in `/admin` and click **WhatsApp**. WhatsApp opens with the message already typed. They send it and mark the reminder `sent`.
4. **Track.** Staff update the outcome: replied, interested, booked, not interested or opted out. "Booked" creates or links a `Leads` record, so conversions are counted. Each year a new reminder is created automatically, for as long as the contact is active.

## Data model (new Payload collections, all staff-only access via `authenticated`)
**`contacts`** — `src/collections/Contacts.ts`
- `name`, `phone` (normalized `91XXXXXXXXXX`, unique), `altPhone`, `email`, `branch` (same options as Leads)
- `relationship`: client / lead (not converted) / cold
- `source`: whatsapp / phone_call / walk_in / referral / past_event_import / website_lead / website_signup
- `verified` (bool; defaults to false for website sources, true otherwise)
- `tier`: vip / regular, `owner` (→ users), `doNotContact` (bool), `language` (en/ta), `notes`, `tags`
- `websiteLead` (→ leads, optional)
- `occasions`: a **join** field so a contact's occasions are visible and addable from the contact page

**`occasions`** — `src/collections/Occasions.ts`
- `contact` (→ contacts)
- `type`: birthday / wedding_anniversary / engagement_anniversary / kid_birthday / housewarming_anniversary / corporate_annual / other
- `personName`, e.g. "Aarav (son)" or "Priya & Karthik"
- `originalDate`, `yearKnown` (bool; if false, the message has no "Nth")
- `eventWithUs` (bool: did Zenfest run this event?)
- `leadTimeDays`: default comes from settings by type (birthday 10, anniversary 14, corporate 30)
- `active`
- `nextOccurrence` (date, indexed, computed in a `beforeChange` hook)

**`reminders`** — `src/collections/Reminders.ts` (the outreach task and log)
- `occasion`, `contact`, `occurrenceDate`, `occurrenceYear`, `nthYear`, `dueDate`
- `status`: pending / sent / replied / interested / booked / not_interested / skipped / opted_out
- `channel`: wa_manual / wa_api / call
- `assignedTo`, `message` (pre-filled, editable), `sentAt`, `sentBy`, `outcomeNotes`, `bookedLead` (→ leads)
- Unique key (`occasion`, `occurrenceYear`), so the job never creates duplicates.

**`reminder-settings`** global — `src/globals/ReminderSettings.ts`
- Lead time per type
- Message templates per type × audience (client vs lead) × language (English/Tamil), with placeholders `{name} {person} {nth} {occasion} {date}`
- Digest recipients
- `ingestWebsite` toggle (off for now)
- `autoSendEnabled` (Phase 3)

## Logic and code to add (in `D:\Zenfest Events Projects\zenfestevents_webapp`)
**`src/lib/occasions/dates.ts`**
- `nextOccurrence(originalDate, today)`: works on the **Asia/Kolkata** calendar date, to avoid the off-by-one error on UTC-stored dates. A 29 Feb date becomes 28 Feb in non-leap years.
- `nthYear()` and `ordinal()` ("1st", "2nd"…).

**`src/lib/occasions/message.ts`:** fills a template, then builds the link with the existing `whatsappLink` from `src/lib/site`. It follows the `WhatsAppCell.tsx` pattern of adding 91 to 10-digit numbers.

**`src/lib/occasions/generate.ts`:** the daily generator. It also rolls `nextOccurrence` forward for past dates and skips contacts marked `doNotContact`.

**Daily job endpoint:** a Payload custom endpoint on `reminders`, `GET /api/reminders/cron`.
- It requires `Authorization: Bearer ${CRON_SECRET}`, which Vercel sends automatically.
- It sends the digest through the existing nodemailer email setup, in the style of `src/hooks/notifySubmission.ts`.
- Add `"crons": [{ "path": "/api/reminders/cron", "schedule": "30 3 * * *" }]` (09:00 IST) to `vercel.json`.

**Phone normalization:** reuse `normalizePhone` from `src/collections/PhoneVerifications.ts`, moved into `src/lib/phone.ts` and exported.

**Admin UI**
- `src/components/admin/UpcomingOccasions.tsx`: a dashboard widget with Today, This week and Next 30 days, overdue count and conversions this month. Register it in `payload.config.ts` next to `RegistryStats` (around line 55).
- A custom `SendWhatsAppCell` on the Reminders list: opens the pre-filled `wa.me` link and marks the reminder `sent`.
- Default list filter: `status = pending`, sorted by `dueDate`.
- A **Quick Add** custom view: one form for contact + occasion(s), for use during or after a call.

**Website ingestion:** `src/hooks/syncOccasionFromWebsite.ts`, an `afterChange` hook on `Leads` (eventDate → occasion) and `Signups` (birthday → occasion).
- It upserts the contact by phone with `source = website_*` and `verified = false`.
- When a lead's `status` becomes `booked`, the contact's relationship is promoted to `client`.
- It does nothing while `ingestWebsite` is off.

**Import:** `src/scripts/importOccasions.ts`, run with `tsx` like the existing seed scripts.
- It reads a CSV with columns `name, phone, branch, relationship, occasion_type, person_name, date, year_known, event_with_us, notes`.
- Provide `docs/occasions-import-template.csv`.

**Registration and migrations:** add the collections and global to `payload.config.ts`, then run `npm run generate:types` and `npm run migrate:create` (production is Postgres).

## Phases
1. **MVP (free, about 1–2 weeks):**
   - Contacts, Occasions, Reminders and settings
   - Quick Add form and CSV import
   - Daily cron, Upcoming widget, wa.me click-to-send, email digest
   - Load your existing event list
2. **Pipeline:**
   - Website ingestion hooks with the unverified tag, plus a staff "verify" action
   - Booked → Lead linking
   - Simple reports: pitched, replied and booked per month, and repeat-booking rate
3. **Automation (optional, ≈₹1/message):**
   - Meta-approved **Marketing** templates (English and Tamil)
   - Auto-send through the existing Cloud API credentials for `tier = regular`, `verified`, not opted-out contacts. VIPs stay a personal call.
   - Extend the WhatsApp webhook (`PhoneVerifications.ts` `webhookReceive`) to mark replies and STOP → `doNotContact`.

**Cost notes (India, 2026; please confirm on the Meta Business Manager rate card):**
- Marketing template ≈ ₹0.86 + 18% GST.
- Replies inside the 24-hour window: the first 1,000 a month are free, then ≈ ₹0.115 each.
- Phases 1 and 2 cost ₹0 in messaging.

**Consent (India's data protection law, the DPDP Act):** only message people who shared their dates with you, keep the opt-out (`doNotContact`) honored everywhere, and include a "reply STOP" line in automated messages.

## Verification
- **Date logic:** a `tsx` script checks `nextOccurrence` and `nthYear` against fixed cases: today, a date that already passed this year, 29 Feb, year-unknown, and an IST timestamp at the edge of a day.
- **Local run** (`npm run dev` on SQLite):
  1. Quick-add a contact with an anniversary 7 days from today in an earlier year.
  2. Call `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/reminders/cron` and check one pending reminder appears with the right Nth.
  3. Call it again and check no duplicate is created.
  4. Click WhatsApp and check the pre-filled text opens and the status becomes `sent`.
  5. Mark it `booked` and check a Lead is linked.
  6. Turn `ingestWebsite` on, submit the website enquiry form, and check an unverified contact and occasion appear.
  7. Run `npm run lint` and `npm run build`.
- **After deploy:** check the Vercel Cron run in Logs the next morning, and that the digest email arrived.

## Sources
- [Dubb – date-based automations](https://support.dubb.com/en/articles/14012268-how-to-create-date-based-automations-for-birthdays-or-anniversaries)
- [OnePageCRM – anniversaries](https://help.onepagecrm.com/article/723-create-anniversaries)
- [AllClients – Birthday Assistant](https://help.allclients.com/article/570-birthday-assistant-overview)
- [Ragic – auto greetings](https://na3.ragic.com/intl/es/blog/344/send-customer-greetings-automatically)
- [AiSensy – automated birthday wish](https://aisensy.com/tutorials/how-to-automate-a-personalized-birthday-wish-to-your-customers)
- [HelloLeads – Interakt special-day wishes](https://www.helloleads.io/learnmore-web/Interakt/specialEventWishes)
- [WATI – template categories](https://support.wati.io/en/articles/11463498-understanding-template-message-categories)
- [CiviCRM – yearly date reminders](https://issues.civicrm.org/jira/browse/CRM-14879)
- [Monica CRM](https://docs.bnkops.com/archive/pre-v2/cm/apps/monica-crm/)
- [Boothbook – keep clients coming back](https://boothbook.com/resources/guide/beyond-the-event-7-ways-to-keep-your-photo-booth-clients-coming-back)
- [Magpie – post-wedding marketing](https://www.magpiewedding.com/wedding-business-clubhouse/post-wedding-marketing/)
- [India WhatsApp pricing 2026 (MyOperator)](https://myoperator.com/blog/whatsapp-business-api-pricing-india-2026)
- [Oct 2026 pricing changes (DEV)](https://dev.to/preciousky_45d956626d31c3/whatsapp-business-platform-pricing-in-rupees-and-the-two-things-that-change-on-1-october-2026-4ko0)
