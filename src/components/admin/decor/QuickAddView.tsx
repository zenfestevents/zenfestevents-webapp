import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { hasRole } from '../../../access/roles'
import { DecorQuickAddForm } from './QuickAddForm'

/**
 * /admin/decor/quick-add (registered in payload.config.ts → admin.components.views): a
 * phone-first screen to add a decoration as a Draft from a few photos and a price.
 * Team members and up only; the form itself saves through /api/decor-items, which checks
 * the same role again.
 */
export function DecorQuickAddView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const allowed = hasRole(req.user as never, 'team')
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user || undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div className="zf-quickadd__head">
          <p className="zf-eyebrow">Decorations</p>
          <h1>Quick add</h1>
          <p>
            Add a decoration from your phone: photos, price, event and category. It saves as a <strong>Draft</strong>{' '}
            (not on the website) so you can finish the details later.
          </p>
          <Link href="/admin/collections/decor-items">← All decorations</Link>
        </div>
        {allowed ? (
          <DecorQuickAddForm />
        ) : (
          <p className="zf-empty">Your role can look at decorations but not add them. Ask a Manager.</p>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
