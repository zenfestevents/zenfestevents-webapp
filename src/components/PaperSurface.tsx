import React from 'react'

/**
 * The site is dark ("night match", styles.css). Features that still carry their own light
 * styling — gift registry, shop, polls, Zenfest AI — sit on paper instead: `.surface-paper`
 * flips every semantic colour token back to ink on ivory. Used as those routes' layout.
 */
export function PaperSurface({ children }: { children: React.ReactNode }) {
  return <div className="surface-paper">{children}</div>
}
