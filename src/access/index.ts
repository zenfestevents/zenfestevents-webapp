import type { Access } from 'payload'

/** Public read access — anyone can read. */
export const anyone: Access = () => true

/** Restricted access — only signed-in admin users. */
export const authenticated: Access = ({ req }) => Boolean(req.user)
