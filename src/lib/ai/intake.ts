// Client-safe: the Zenfest AI intake form — the questions asked before the chat starts,
// so the AI and the team know the basics (and who to call) from the start. The same
// rules (checkIntakeStep) run in the form and in startChat, so the server can't be
// sent a half-filled form.

export const INTAKE_EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'housewarming', label: 'Housewarming' },
  { value: 'corporate', label: 'Corporate event' },
  { value: 'baby-shower', label: 'Baby shower / Seemantham' },
  { value: 'other', label: 'Other' },
] as const

export type IntakeEventType = (typeof INTAKE_EVENT_TYPES)[number]['value']

/** Wedding-style events ask who's speaking as bride / groom / family, and for each function's date. */
export const isWeddingType = (t: string) => t === 'wedding' || t === 'engagement'

export const WEDDING_FUNCTIONS = [
  'Nichayathartham / Engagement',
  'Mehendi',
  'Haldi',
  'Sangeet',
  'Muhurtham (wedding)',
  'Reception',
] as const

type Choice = { readonly value: string; readonly label: string }

export const PLANNER_ROLES: { wedding: readonly Choice[]; other: readonly Choice[] } = {
  wedding: [
    { value: 'bride', label: 'Bride' },
    { value: 'groom', label: 'Groom' },
    { value: 'family', label: 'Family member' },
    { value: 'friend', label: 'Friend' },
  ],
  other: [
    { value: 'host', label: 'I’m hosting it' },
    { value: 'family', label: 'Family member' },
    { value: 'organiser', label: 'Organising for a company / someone else' },
  ],
}

export const FAMILY_RELATIONS = [
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Uncle / Aunt',
  'Cousin',
  'Grandparent',
  'Other relative',
] as const

/** The "Complete event planning" service choice: every specialist. */
export const COMPLETE_PLANNING = 'complete'
export const COMPLETE_PLANNING_LABEL = 'Complete event planning'

/** When an event / function happens: the month is required, the exact date optional. */
export type When = {
  /** yyyy-mm */
  month: string
  /** yyyy-mm-dd inside `month`, or '' when not fixed yet. */
  date: string
}

export type IntakeDetails = {
  eventType: IntakeEventType
  /** bride | groom | family | friend | host | organiser */
  planner: string
  /** Only for planner = family, e.g. "Father". */
  relation: string
  /** Weddings: one row per ticked function. */
  functions: ({ name: string } & When)[]
  /** Non-wedding events. */
  event: When
  area: string
  guests: number | null
  /** Specialist slugs, or [COMPLETE_PLANNING]. At least one. */
  services: string[]
  notes: string
  name: string
  phone: string
}

export const INTAKE_STEPS = ['Your event', 'When & where', 'Services & you', 'Confirm'] as const

const MAX = { text: 120, notes: 1500 }

const label = (list: readonly Choice[], v: string) => list.find((x) => x.value === v)?.label ?? v

export function plannerLabel(d: Pick<IntakeDetails, 'eventType' | 'planner' | 'relation'>): string {
  const roles = isWeddingType(d.eventType) ? PLANNER_ROLES.wedding : PLANNER_ROLES.other
  const base = label(roles, d.planner)
  return d.planner === 'family' && d.relation ? `Family member (${d.relation})` : base
}

/** Today in India as yyyy-mm-dd (the business's calendar, wherever the code runs). */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

/** "12 Dec 2026" from yyyy-mm-dd; anything else passes through. */
export function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** "Dec 2026" from yyyy-mm; anything else passes through. */
export function prettyMonth(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!m) return ym
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, 1))
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const whenText = (w: When) => (w.date ? prettyDate(w.date) : `${prettyMonth(w.month)} (date not fixed)`)

/** The event's date(s) as one line, e.g. "Muhurtham (wedding) 13 Dec 2026; Reception Dec 2026 (date not fixed)". */
export function whenLine(d: Pick<IntakeDetails, 'eventType' | 'functions' | 'event'>): string {
  if (isWeddingType(d.eventType)) return d.functions.map((f) => `${f.name} ${whenText(f)}`).join('; ')
  return whenText(d.event)
}

/** Services as words; `serviceNames` maps specialist slugs to names. */
export function servicesText(d: Pick<IntakeDetails, 'services'>, serviceNames: Record<string, string> = {}): string {
  if (d.services.includes(COMPLETE_PLANNING)) return `${COMPLETE_PLANNING_LABEL} (all services)`
  return d.services.map((s) => serviceNames[s] ?? s).join(', ')
}

/** Label/value rows shown on the intake card and in the lead. */
export function intakeRows(d: IntakeDetails, serviceNames: Record<string, string> = {}): [string, string][] {
  const rows: [string, string][] = [
    ['Event', label(INTAKE_EVENT_TYPES, d.eventType)],
    ['Planning as', plannerLabel(d)],
    [isWeddingType(d.eventType) ? 'Functions' : 'When', whenLine(d)],
    ['Where', d.area],
    ['Guests', `about ${d.guests}`],
    ['Services', servicesText(d, serviceNames)],
  ]
  if (d.notes) rows.push(['Notes', d.notes])
  rows.push(['Name', d.name], ['Phone', d.phone])
  return rows
}

/** A short name for the chat list, e.g. "Wedding · Dec 2026 · Tambaram". */
export function chatTitle(d: IntakeDetails): string {
  const first = isWeddingType(d.eventType) ? d.functions[0] : d.event
  return [label(INTAKE_EVENT_TYPES, d.eventType), first ? prettyMonth(first.month) : '', d.area].filter(Boolean).join(' · ')
}

/** Earliest month a customer can pick (this month, India time). */
export const minMonth = () => todayIST().slice(0, 7)

function whenProblem(w: When | undefined, what: string): string {
  if (!w || !/^\d{4}-\d{2}$/.test(w.month)) return `Please choose the month for ${what}.`
  if (w.month < minMonth()) return `The month for ${what} has already passed.`
  if (w.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.date) || !w.date.startsWith(w.month)) {
      return `The exact date for ${what} must be in ${prettyMonth(w.month)}.`
    }
    if (w.date < todayIST()) return `The date for ${what} has already passed.`
  }
  return ''
}

const PHONE = /^[6-9]\d{9}$/

/**
 * The first problem in one step of the form, or ''. Step 3 (Confirm) has nothing new.
 * Used by the form for each step and by the server for all of them.
 */
export function checkIntakeStep(step: number, d: Partial<IntakeDetails>, knownServices: string[]): string {
  const wedding = isWeddingType(d.eventType ?? '')
  if (step === 0) {
    if (!d.eventType || !INTAKE_EVENT_TYPES.some((t) => t.value === d.eventType)) return 'Please choose the type of event.'
    const roles = wedding ? PLANNER_ROLES.wedding : PLANNER_ROLES.other
    if (!d.planner || !roles.some((r) => r.value === d.planner)) {
      return wedding ? 'Please tell us who you are — bride, groom, family or friend.' : 'Please tell us who is planning.'
    }
    if (d.planner === 'family' && !d.relation?.trim()) return 'Please choose your relation.'
  }
  if (step === 1) {
    if (wedding) {
      if (!d.functions?.length) return 'Please tick at least one function.'
      for (const f of d.functions) {
        const p = whenProblem(f, f.name)
        if (p) return p
      }
    } else {
      const p = whenProblem(d.event, 'your event')
      if (p) return p
    }
    if (!d.area?.trim()) return 'Please tell us where it is happening.'
    if (!d.guests || d.guests < 1) return 'Please tell us roughly how many guests.'
  }
  if (step === 2) {
    const services = d.services ?? []
    const valid = services.filter((s) => s === COMPLETE_PLANNING || knownServices.includes(s))
    if (!valid.length) return `Please select one or more services, or ${COMPLETE_PLANNING_LABEL}.`
    if (!d.name?.trim()) return 'Please tell us your name.'
    if (!PHONE.test((d.phone ?? '').replace(/\D/g, '').slice(-10))) return 'Enter a valid 10-digit mobile number.'
  }
  return ''
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const toWhen = (v: unknown): When => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  return { month: str(o.month, 7), date: str(o.date, 10) }
}

/**
 * Cleans untrusted form input (server side) and applies every step's rules. Returns the
 * first problem, or the details. The phone is normalised by the caller.
 */
export function parseIntake(raw: unknown, knownServices: string[]): { ok: true; data: IntakeDetails } | { ok: false; error: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const eventType = INTAKE_EVENT_TYPES.find((t) => t.value === r.eventType)?.value
  const wedding = isWeddingType(eventType ?? '')
  const planner = str(r.planner, 20)
  const services = Array.isArray(r.services)
    ? [...new Set(r.services.map(String).filter((s) => s === COMPLETE_PLANNING || knownServices.includes(s)))]
    : []
  const guestsNum = Number(r.guests)
  const d: Partial<IntakeDetails> = {
    eventType,
    planner,
    relation: planner === 'family' ? str(r.relation, 40) : '',
    functions: wedding && Array.isArray(r.functions)
      ? r.functions
          .map((f) => ({ name: str((f as Record<string, unknown>)?.name, 60), ...toWhen(f) }))
          .filter((f) => (WEDDING_FUNCTIONS as readonly string[]).includes(f.name))
          .slice(0, WEDDING_FUNCTIONS.length)
      : [],
    event: wedding ? { month: '', date: '' } : toWhen(r.event),
    area: str(r.area, MAX.text),
    guests: Number.isFinite(guestsNum) && guestsNum >= 1 ? Math.min(Math.round(guestsNum), 100000) : null,
    // "Complete event planning" stands for everything; drop single picks alongside it.
    services: services.includes(COMPLETE_PLANNING) ? [COMPLETE_PLANNING] : services,
    notes: str(r.notes, MAX.notes),
    name: str(r.name, MAX.text),
    phone: str(r.phone, 20),
  }
  for (let step = 0; step < 3; step++) {
    const error = checkIntakeStep(step, d, knownServices)
    if (error) return { ok: false, error }
  }
  return { ok: true, data: d as IntakeDetails }
}
