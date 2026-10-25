'use client'

// The Zenfest AI entry points shown on every page (header, hero, bottom bar). Kept apart
// from ChatLauncher so they don't pull the chat code into every page while the AI is off.
import Link from 'next/link'
import React from 'react'

import { useZenfestAIOptional } from './context'

/** Paths with their own sticky UI, or the full-page chat. */
export const hidesChatLauncher = (pathname: string) =>
  pathname === '/plan' || pathname.startsWith('/r/') || pathname.startsWith('/dashboard/')

/**
 * A link that opens the Zenfest AI chat in place (panel or full-screen) and falls
 * back to a normal link: /plan without JavaScript, /enquire when the AI is off.
 */
export function AiLink(props: {
  className?: string
  children: React.ReactNode
  /** Shown instead (linking to /enquire) when Zenfest AI is switched off; `false` hides the link. */
  fallback?: React.ReactNode
  prefill?: string
  /** Runs before the chat opens, e.g. to close the phone menu. */
  onOpen?: () => void
}) {
  const ai = useZenfestAIOptional()
  if (!ai?.enabled) {
    if (props.fallback === false) return null
    return (
      <Link className={props.className} href="/enquire">
        {props.fallback ?? props.children}
      </Link>
    )
  }
  return (
    <a
      className={props.className}
      href="/plan"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        props.onOpen?.()
        ai.open(props.prefill)
      }}
    >
      {props.children}
    </a>
  )
}
