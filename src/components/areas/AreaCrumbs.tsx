import Link from 'next/link'
import React from 'react'

import { SITE_URL, jsonLdText } from '../../lib/seo'

export type Crumb = { name: string; href: string }

/**
 * Visible breadcrumbs plus their schema.org BreadcrumbList, which Google shows in place of
 * the URL in results: Home › City › Service › Area. The last crumb is the current page.
 */
export function AreaCrumbs({ items }: { items: Crumb[] }) {
  const list = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.href}`,
    })),
  }
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        {items.map((c, i) =>
          i < items.length - 1 ? (
            <React.Fragment key={c.href}>
              <Link href={c.href}>{c.name}</Link> <span aria-hidden="true">/</span>
            </React.Fragment>
          ) : (
            <span key={c.href} aria-current="page">
              {c.name}
            </span>
          ),
        )}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(list) }} />
    </>
  )
}
