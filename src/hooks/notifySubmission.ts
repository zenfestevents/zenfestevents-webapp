import type { CollectionAfterChangeHook } from 'payload'

/**
 * Sends a notification email to the business when a new lead or vendor
 * application is submitted. Fails softly: if no email transport is configured
 * (e.g. local dev), the submission is still saved and a log line is written.
 */
export const notifySubmission =
  (label: string, fields: string[]): CollectionAfterChangeHook =>
  async ({ doc, operation, req }) => {
    if (operation !== 'create') return doc

    const to = process.env.LEAD_NOTIFICATION_EMAIL || 'zenfestevents@gmail.com'
    const lines = fields
      .map((f) => `${f}: ${doc?.[f] ?? '-'}`)
      .join('\n')
    const summary = `New ${label} received via the website.\n\n${lines}`

    try {
      await req.payload.sendEmail({
        to,
        subject: `New ${label}: ${doc?.name ?? 'Website enquiry'}`,
        text: summary,
      })
    } catch (err) {
      req.payload.logger.warn(
        `[notifySubmission] Could not email ${label} notification (saved to DB regardless): ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }

    return doc
  }
