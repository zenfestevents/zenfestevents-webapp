import type { Access, FieldAccess, PayloadRequest } from 'payload'

// Team roles for /admin (owner, 2026-10-25). Every staff login (`users`) has one role;
// each role can do everything the roles below it can. Vendors and couples never pass
// any of these checks — they all start with "is this a `users` login".
//
//   Owner        everything: Team, settings, deleting
//   Manager      approves vendors / listings / reviews, edits the website, sends campaigns
//   Team member  works enquiries, replies on WhatsApp, sends wishes; no approving, no deleting
//   Viewer       looks only (trainees)
//
// Never use `authenticated` on a new collection: pick one of the checks below.

export const ROLES = [
  { label: 'Owner — can do everything, including Team and deleting', value: 'owner' },
  { label: 'Manager — can approve and edit the website, cannot delete', value: 'manager' },
  { label: 'Team member — works enquiries and WhatsApp, cannot approve or delete', value: 'team' },
  { label: 'Viewer — can only look', value: 'viewer' },
] as const

export type Role = (typeof ROLES)[number]['value']

/** Role name + what it may do, in plain words (admin home "Today" board). */
export const ROLE_HELP: Record<Role, [string, string]> = {
  owner: ['the Owner', 'you can do everything, including adding team members and deleting.'],
  manager: ['a Manager', 'you can approve vendors, edit the website and send bulk messages. Only the Owner can delete.'],
  team: ['a Team member', 'you can work on enquiries, reply on WhatsApp and send wishes. Approving is for Managers.'],
  viewer: ['a Viewer', 'you can look at everything but not change it.'],
}

const RANK: Record<Role, number> = { viewer: 0, team: 1, manager: 2, owner: 3 }

type MaybeUser = { collection?: string; role?: string | null; active?: boolean | null } | null | undefined

/** The staff role of a login, or null for vendors, couples, switched-off members and visitors. */
export function roleOf(user: MaybeUser): Role | null {
  if (user?.collection !== 'users' || user.active === false) return null
  return user.role && user.role in RANK ? (user.role as Role) : 'viewer'
}

/** Whether this login's role is `min` or higher. */
export function hasRole(user: MaybeUser, min: Role): boolean {
  const role = roleOf(user)
  return role !== null && RANK[role] >= RANK[min]
}

export const isStaffReq = (req: PayloadRequest, min: Role = 'viewer') => hasRole(req.user, min)

/** Any team member can look (Viewer and up). */
export const canView: Access = ({ req }) => hasRole(req.user, 'viewer')
/** Day-to-day work: Team member and up. */
export const canWork: Access = ({ req }) => hasRole(req.user, 'team')
/** Approving, website content, settings, campaigns: Manager and up. */
export const canManage: Access = ({ req }) => hasRole(req.user, 'manager')
/** Deleting and the Team list: Owner only. */
export const ownerOnly: Access = ({ req }) => hasRole(req.user, 'owner')

export const canViewField: FieldAccess = ({ req }) => hasRole(req.user, 'viewer')
export const canWorkField: FieldAccess = ({ req }) => hasRole(req.user, 'team')
export const canManageField: FieldAccess = ({ req }) => hasRole(req.user, 'manager')
export const ownerOnlyField: FieldAccess = ({ req }) => hasRole(req.user, 'owner')

/** For `admin.hidden`: keep a list out of the menu for anyone below `min`. */
export const hiddenBelow =
  (min: Role) =>
  ({ user }: { user: unknown }) =>
    !hasRole(user as MaybeUser, min)

/**
 * Lists hidden from /admin for now (owner, 2026-10-25): features that are switched off on
 * the site. Hiding only removes them from the admin menu and pages — the data, the REST API
 * and the website keep working (the public gift registry is still live). Delete a line to
 * bring that list back.
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

/** `admin.hidden` for a list: hidden for everyone while in ADMIN_HIDDEN, else from `min` down. */
export const adminHidden = (slug: string, min: Role = 'viewer') =>
  ADMIN_HIDDEN.has(slug) ? true : hiddenBelow(min)
