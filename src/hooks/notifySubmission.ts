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
    // Dotted paths reach into groups (e.g. `photography.services`). Blank nested
    // fields are skipped so one vendor type's email doesn't list another's fields.
    const lines = fields
      .flatMap((f) => {
        const value = f.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], doc)
        // Array rows (e.g. price & camera per service) print as "a / b / c; …".
        const text = Array.isArray(value)
          ? value
              .map((item) =>
                item && typeof item === 'object'
                  ? Object.entries(item)
                      .filter(([k, v]) => k !== 'id' && v != null && v !== '')
                      .map(([, v]) => v)
                      .join(' / ')
                  : item,
              )
              .join(typeof value[0] === 'object' ? '; ' : ', ')
          : value
        const blank = text === undefined || text === null || text === ''
        if (blank && f.includes('.')) return []
        return `${f}: ${blank ? '-' : text}`
      })
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
