import type { Access, Where } from 'payload'

import { hasLevel, isOwner, type Module } from './roles'

// Three kinds of account share Payload's auth: admin/staff (`users`), vendors
// (`vendors`) and couples (`customers`). `req.user` is set for all of them, so
// "is someone logged in" is never enough — always check which collection.
// Staff are the Owner or a Team member with access per module: see ./roles.ts, and use
// `accessFor(module)` from there for anything new.

/** Public read access — anyone can read. */
export const anyone: Access = () => true

export const isVendor: Access = ({ req }) => req.user?.collection === 'vendors'
export const isCustomer: Access = ({ req }) => req.user?.collection === 'customers'

/** Staff with at least Read only in `module` see every record; a vendor/couple sees only their own account. */
export const adminOrSelf =
  (slug: 'vendors' | 'customers', module: Module): Access =>
  ({ req }) => {
    if (hasLevel(req.user, module, 'read')) return true
    if (req.user?.collection === slug) return { id: { equals: req.user.id } } as Where
    return false
  }

/**
 * Staff with Full access to `module` (or only the Owner, with `ownerOnly`), or the vendor
 * whose id is in `field` (e.g. a vendor's own photos).
 */
export const adminOrVendorOwner =
  (field: string, module: Module, ownerOnly = false): Access =>
  ({ req }) => {
    if (ownerOnly ? isOwner(req.user) : hasLevel(req.user, module, 'full')) return true
    if (req.user?.collection === 'vendors') return { [field]: { equals: req.user.id } } as Where
    return false
  }
