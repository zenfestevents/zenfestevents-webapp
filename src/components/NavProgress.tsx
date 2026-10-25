'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useRef, useState } from 'react'

// A click on a prefetched (cached) page lands before this, so those never flash the line.
const SHOW_AFTER_MS = 150
// Links that stay on the page (a download, a handler that cancels) would leave it running.
const GIVE_UP_MS = 10000

/**
 * A gold line along the top of the screen from the moment a link is clicked until the
 * next page arrives. Per-visit pages (marketplace, account, Runs club, refer, vendor
 * sign-up) wait on the server before Next.js shows anything, so without it a tap looked
 * ignored for up to a couple of seconds. No loading.tsx on purpose: a loading screen
 * makes a page stream, and a streamed notFound() / redirect() answers 200.
 */
function Line() {
  const route = `${usePathname()}?${useSearchParams().toString()}`
  // `from` is the page the click left; once the route differs, the new page is in.
  const [run, setRun] = useState<{ loading: boolean; from: string }>({ loading: false, from: '' })
  const arrived = run.loading && run.from !== route
  const routeRef = useRef(route)
  const timers = useRef<number[]>([])

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  useEffect(() => {
    routeRef.current = route
  }, [route])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || /^\/(api|admin)(\/|$)/.test(url.pathname)) return
      // Same page, or only the #hash changes: nothing to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      const from = routeRef.current
      clear()
      timers.current.push(
        window.setTimeout(() => {
          if (routeRef.current === from) setRun({ loading: true, from })
        }, SHOW_AFTER_MS),
        window.setTimeout(() => setRun({ loading: false, from: '' }), GIVE_UP_MS),
      )
    }
    // Capture: Next's <Link> cancels the click before it would bubble up to us.
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      clear()
    }
  }, [])

  // The new page is in: the line finishes and fades, then resets.
  useEffect(() => {
    if (!arrived) return
    const t = window.setTimeout(() => setRun({ loading: false, from: '' }), 450)
    return () => window.clearTimeout(t)
  }, [arrived])

  const state = arrived ? ' nav-progress--done' : run.loading ? ' nav-progress--loading' : ''
  return <div aria-hidden className={`nav-progress${state}`} />
}

export function NavProgress() {
  // useSearchParams needs a boundary, or every cached page would render on the client.
  return (
    <Suspense fallback={null}>
      <Line />
    </Suspense>
  )
}
