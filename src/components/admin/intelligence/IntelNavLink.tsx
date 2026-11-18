import React from 'react'
import Link from 'next/link'
import type { ServerProps } from 'payload'

import { isOwner } from '../../../access/roles'

/** Admin menu link to /admin/intelligence (admin.components.afterNavLinks), shown to the Owner only. */
export function IntelNavLink({ user }: ServerProps) {
  if (!isOwner(user as never)) return null
  return (
    <div className="zf-intel-nav">
      <p className="zf-intel-nav__label">Content</p>
      <Link className="nav__link" href="/admin/intelligence" prefetch={false}>
        <span className="nav__link-label">Intelligence Hub</span>
      </Link>
    </div>
  )
}
