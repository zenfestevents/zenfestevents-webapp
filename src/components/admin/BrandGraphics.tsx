import React from 'react'

/**
 * Zenfest branding inside /admin (registered under `admin.components.graphics`
 * in payload.config.ts). Logo = login page; Icon = the small mark in the nav
 * and breadcrumb. Plain <img> like Header.tsx: next/image only allows
 * /api/media/file/** (next.config.ts). Styled in app/(payload)/custom.scss.
 */
export function AdminLogo() {
  return (
    <span className="zf-admin-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/emblem.png" alt="" width={72} height={72} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wordmark.png" alt="Zenfest Events" width={210} height={68} />
      <span className="zf-admin-logo__tag">Team workspace</span>
    </span>
  )
}

export function AdminIcon() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="zf-admin-icon" src="/brand/emblem.png" alt="Zenfest Events" width={28} height={28} />
}
