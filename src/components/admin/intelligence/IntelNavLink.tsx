import React from 'react'
import Link from 'next/link'
import type { ServerProps } from 'payload'

import { isStaff } from '../../../access/roles'
import { SECTIONS } from './parts'

/** "Content" group in the admin menu (admin.components.afterNavLinks): the Intelligence Hub pages, for every team login. */
export function IntelNavLink({ user }: ServerProps) {
  if (!isStaff(user as never)) return null
  return (
    <div className="zf-intel-nav">
      <p className="zf-intel-nav__label">Content</p>
      {SECTIONS.map((s) => (
        <Link key={s.id} className="nav__link" href={s.href} prefetch={false}>
          <span className="nav__link-label">{s.id === 'today' ? 'Intelligence Hub' : s.label}</span>
        </Link>
      ))}
    </div>
  )
}
