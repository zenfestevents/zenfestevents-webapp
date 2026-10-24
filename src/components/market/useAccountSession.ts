'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export type AccountSession = {
  kind: 'vendor' | 'customer' | null
  name: string
  /** Runs club standing, when logged in. */
  standing: { runs: number; tier: string; next: string | null; toNext: number; progress: number } | null
}

// The header button and the phone bar both ask on every navigation: one request per page.
let shared: { path: string; promise: Promise<AccountSession> } | null = null

function load(path: string) {
  if (shared?.path !== path) {
    shared = {
      path,
      promise: fetch('/account/session', { cache: 'no-store' })
        .then((r) => r.json() as Promise<AccountSession>)
        .catch(() => ({ kind: null, name: '', standing: null })),
    }
  }
  return shared.promise
}

/** Who is logged in (null until known). Fetched after paint, again on navigation. */
export function useAccountSession() {
  const pathname = usePathname()
  const [session, setSession] = useState<AccountSession | null>(null)
  useEffect(() => {
    let live = true
    load(pathname).then((s) => live && setSession(s))
    return () => {
      live = false
    }
  }, [pathname])
  return session
}
