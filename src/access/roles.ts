import type { Access, FieldAccess, PayloadRequest } from 'payload'

// Team access for /admin (owner, 2026-11-02). Every staff login (`users`) is either the
// **Owner** (everything, including Team and the System lists) or a **Team member**, whose
// access is set per module on their Team page:
//
//   None       the module is hidden and its data is closed, in the admin and over the API
//   Read only  can look, nothing else
//   Add & edit can add and change records; cannot delete, approve or send bulk messages
//   Full       everything in that module: deleting, approving vendors / listings / reviews,
//              sending WhatsApp campaigns, settings
//
// Vendors and couples never pass any of these checks: they all start with "is this a
// `users` login". Never use a bare "is someone logged in" check on a new collection: pick the
// module it belongs to and use `accessFor(module)`. Lists with no module (System: Team, phone
// checks, run history, invite visits, and the features switched off for now) use `ownerOnly`.

/** The `role` select. Only Owner and Team member are offered; manager / viewer are the old roles (2026-10-25), converted by the 2026-11-02 migration and kept so the database column stays valid. */
export const ROLES = [
  { label: 'Owner — can do everything, including Team', value: 'owner' },
  { label: 'Manager (old role) — set “Access by module” below', value: 'manager' },
  { label: 'Team member — only what you set in “Access by module” below', value: 'team' },
  { label: 'Viewer (old role) — set “Access by module” below', value: 'viewer' },
] as const

export type Role = (typeof ROLES)[number]['value']

/** The access levels, lowest first. */
export const LEVELS = [
  { value: 'none', label: 'None — cannot see this module', rank: 0 },
  { value: 'read', label: 'Read only — can look, cannot change', rank: 1 },
  { value: 'edit', label: 'Add & edit — can add and change, cannot delete or approve', rank: 2 },
  { value: 'full', label: 'Full — everything, including delete and approve', rank: 3 },
] as const

export type Level = (typeof LEVELS)[number]['value']

const RANK: Record<Level, number> = { none: 0, read: 1, edit: 2, full: 3 }

/** The menu groups a team member can be given access to (the admin menu's own groups). */
export const MODULES = [
  { value: 'clients', label: 'Clients', help: 'Enquiries and client accounts' },
  { value: 'vendors', label: 'Vendors', help: 'Vendor applications, vendor listings and uploads' },
  { value: 'whatsapp', label: 'WhatsApp', help: 'Chats, contacts and campaigns' },
  { value: 'occasions', label: 'Birthdays & anniversaries', help: 'Contacts, wishes and wish settings' },
  { value: 'decorations', label: 'Decorations', help: 'Decorations, suppliers, photos, prices and settings' },
  { value: 'website', label: 'Website', help: 'Our work, services, packages, reviews, photos and website settings' },
  { value: 'rewards', label: 'Rewards', help: 'Reward settings' },
] as const

export type Module = (typeof MODULES)[number]['value']

/** Lists with no module: only the Owner opens them (Team, phone checks, run history, invite visits, features switched off). */
export type OwnerArea = 'system'

export const isLevel = (v: unknown): v is Level => typeof v === 'string' && v in RANK

type MaybeUser =
  | {
      collection?: string
      role?: string | null
      active?: boolean | null
      moduleAccess?: Partial<Record<Module, string | null>> | null
    }
  | null
  | undefined

/** A login in `users` whose access is switched on (not a vendor, a couple, a visitor or a member who left). */
export function isStaff(user: MaybeUser): boolean {
  return user?.collection === 'users' && user.active !== false
}

export function isOwner(user: MaybeUser): boolean {
  return isStaff(user) && user?.role === 'owner'
}

/** What this login may do in `module`. The Owner has Full everywhere; a member with nothing set has None. */
export function levelOf(user: MaybeUser, module: Module | OwnerArea): Level {
  if (!isStaff(user)) return 'none'
  if (user?.role === 'owner') return 'full'
  if (module === 'system') return 'none'
  const set = user?.moduleAccess?.[module]
  return isLevel(set) ? set : 'none'
}

/** Whether this login has at least `min` in `module`. */
export function hasLevel(user: MaybeUser, module: Module, min: Exclude<Level, 'none'>): boolean {
  return RANK[levelOf(user, module)] >= RANK[min]
}

export const isStaffReq = (req: PayloadRequest) => isStaff(req.user)

/**
 * The checks for one module. Same names as the old role checks, now scoped:
 *   canView   Read only and up
 *   canWork   Add & edit and up (add, change; the day-to-day work)
 *   canManage Full (approving, settings, campaigns)
 *   canDelete Full (deleting a record)
 * `…Field` twins are for field-level `access`.
 */
export function accessFor(module: Module, slug?: string) {
  // A list switched off for now (ADMIN_HIDDEN, below) is Owner-only over the API as well.
  const closed = slug ? () => ADMIN_HIDDEN.has(slug) : () => false
  const allowed = (user: MaybeUser, min: Exclude<Level, 'none'>) =>
    closed() ? isOwner(user) : hasLevel(user, module, min)
  const at =
    (min: Exclude<Level, 'none'>): Access =>
    ({ req }) =>
      allowed(req.user, min)
  const atField =
    (min: Exclude<Level, 'none'>): FieldAccess =>
    ({ req }) =>
      allowed(req.user, min)
  return {
    canView: at('read'),
    canWork: at('edit'),
    canManage: at('full'),
    canDelete: at('full'),
    canViewField: atField('read'),
    canWorkField: atField('edit'),
    canManageField: atField('full'),
    /** For code that holds a `req` (custom endpoints, hooks). */
    can: (req: PayloadRequest, min: Exclude<Level, 'none'>) => allowed(req.user, min),
  }
}

/** Only the Owner: Team, System lists, and anything the Owner alone may see. */
export const ownerOnly: Access = ({ req }) => isOwner(req.user)
export const ownerOnlyField: FieldAccess = ({ req }) => isOwner(req.user)

/**
 * Lists hidden from /admin for now (owner, 2026-10-25): features that are switched off on
 * the site. Hiding only removes them from the admin menu and pages — the data, the REST API
 * and the website keep working (the public gift registry is still live). Delete a line to
 * bring that list back. While hidden they are Owner-only over the API too (2026-11-02).
 */
export const ADMIN_HIDDEN = new Set<string>([
  // Gift registry
  'registry-events',
  'registry-items',
  'registry-claims',
  'registry-clicks',
  'registry-guests',
  'registry-leads',
  // Polls
  'polls',
  'poll-votes',
  'poll-voters',
  // Zenfest AI
  'ai-conversations',
  // Shop
  'products',
  // Earn from events
  'host-applications',
  // ₹100 offer sign-ups (/signup isn't advertised yet)
  'signups',
  // Marketplace enquiries (the couples' marketplace is "Coming soon")
  'enquiries',
])

/** `admin.hidden` for a list in `module`: hidden while in ADMIN_HIDDEN, or from anyone with no access to the module. */
export const moduleHidden =
  (module: Module, slug: string) =>
  ({ user }: { user: unknown }) =>
    ADMIN_HIDDEN.has(slug) ? true : !hasLevel(user as MaybeUser, module, 'read')

/** `admin.hidden` for an Owner-only list: hidden for everyone else, and for everyone while in ADMIN_HIDDEN. */
export const ownerHidden =
  (slug: string) =>
  ({ user }: { user: unknown }) =>
    ADMIN_HIDDEN.has(slug) ? true : !isOwner(user as MaybeUser)

/** Each module's access as plain words, for the admin home ("you can read X, edit Y"). */
export function accessSummary(user: MaybeUser): { owner: boolean; lines: { label: string; level: Level }[] } {
  const owner = isOwner(user)
  return {
    owner,
    lines: MODULES.map((m) => ({ label: m.label, level: levelOf(user, m.value) })),
  }
}
