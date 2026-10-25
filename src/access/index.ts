import type { Access, FieldAccess, Where } from 'payload'

import { hasRole, type Role } from './roles'

// Three kinds of account share Payload's auth: admin/staff (`users`), vendors
// (`vendors`) and couples (`customers`). `req.user` is set for all of them, so
// "is someone logged in" is never enough — always check which collection.
// Staff also have a role (owner / manager / team / viewer): see ./roles.ts, and use
// its checks (canView, canWork, canManage, ownerOnly) for anything new.

/** Public read access — anyone can read. */
export const anyone: Access = () => true

/** Any Zenfest staff login (the `users` collection) whose access is switched on. */
export const isAdmin: Access = ({ req }) => hasRole(req.user, 'viewer')

/**
 * Kept under its old name. It used to be `Boolean(req.user)`, which a vendor or couple
 * login would pass. Collections now use the role checks in ./roles.ts instead.
 */
export const authenticated: Access = isAdmin

/** Field-level twin of `isAdmin`. */
export const isAdminField: FieldAccess = ({ req }) => hasRole(req.user, 'viewer')

export const isVendor: Access = ({ req }) => req.user?.collection === 'vendors'
export const isCustomer: Access = ({ req }) => req.user?.collection === 'customers'

/** Staff see every record; a vendor/couple sees only their own account. */
export const adminOrSelf =
  (slug: 'vendors' | 'customers'): Access =>
  ({ req }) => {
    if (hasRole(req.user, 'viewer')) return true
    if (req.user?.collection === slug) return { id: { equals: req.user.id } } as Where
    return false
  }

/** Staff from role `min` up, or the vendor whose id is in `field` (e.g. a vendor's own photos). */
export const adminOrVendorOwner =
  (field: string, min: Role = 'manager'): Access =>
  ({ req }) => {
    if (hasRole(req.user, min)) return true
    if (req.user?.collection === 'vendors') return { [field]: { equals: req.user.id } } as Where
    return false
  }
