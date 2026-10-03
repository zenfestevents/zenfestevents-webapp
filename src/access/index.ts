import type { Access, FieldAccess, Where } from 'payload'

// Three kinds of account share Payload's auth: admin/staff (`users`), vendors
// (`vendors`) and couples (`customers`). `req.user` is set for all of them, so
// "is someone logged in" is never enough — always check which collection.

/** Public read access — anyone can read. */
export const anyone: Access = () => true

/** Only Zenfest admin/staff (the `users` collection). */
export const isAdmin: Access = ({ req }) => req.user?.collection === 'users'

/**
 * Kept under its old name so every existing collection stays admin-only. It
 * used to be `Boolean(req.user)`, which a vendor or couple login would pass.
 */
export const authenticated: Access = isAdmin

/** Field-level twin of `isAdmin`. */
export const isAdminField: FieldAccess = ({ req }) => req.user?.collection === 'users'

export const isVendor: Access = ({ req }) => req.user?.collection === 'vendors'
export const isCustomer: Access = ({ req }) => req.user?.collection === 'customers'

/** Admin sees every record; a vendor/couple sees only their own account. */
export const adminOrSelf =
  (slug: 'vendors' | 'customers'): Access =>
  ({ req }) => {
    if (req.user?.collection === 'users') return true
    if (req.user?.collection === slug) return { id: { equals: req.user.id } } as Where
    return false
  }

/** Admin, or the vendor whose id is in `field` (e.g. a vendor's own photos). */
export const adminOrVendorOwner =
  (field: string): Access =>
  ({ req }) => {
    if (req.user?.collection === 'users') return true
    if (req.user?.collection === 'vendors') return { [field]: { equals: req.user.id } } as Where
    return false
  }
