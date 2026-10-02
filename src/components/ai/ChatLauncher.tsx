'use client'

// Zenfest AI on every page. Desktop (≥900px): a gold bubble bottom-right that opens a
// side panel. Phones: no bubble (it would cover content and the bottom bar) — the
// bar's "Ask Zenfest AI" button opens the same chat full-screen. Both hidden on the
// registry pages and on /plan, which shows the chat itself.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

import { ZenfestChat } from './ZenfestChat'
import { useZenfestAI, useZenfestAIOptional } from './ZenfestAIProvider'

/** Paths with their own sticky UI, or the full-page chat. */
export const hidesChatLauncher = (pathname: string) =>
  pathname === '/plan' || pathname.startsWith('/r/') || pathname.startsWith('/dashboard/')

export function ChatLauncher() {
  const { enabled, isOpen, open, close } = useZenfestAI()
  const pathname = usePathname()
  const hidden = hidesChatLauncher(pathname)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('zai-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('zai-open')
    }
  }, [isOpen, close])

  // Going to /plan shows the chat in the page instead.
  useEffect(() => {
    if (pathname === '/plan' && isOpen) close()
  }, [pathname, isOpen, close])

  if (!enabled || hidden) return null

  return (
    <>
      {!isOpen && (
        <button type="button" className="zai-bubble" onClick={() => open()} aria-label="Chat with Zenfest AI">
          <span className="zai-bubble__spark" aria-hidden="true">
            ✦
          </span>
          <span className="zai-bubble__label">
            Ask <strong>Zenfest AI</strong>
          </span>
        </button>
      )}
      {isOpen && (
        <div className="zai-panel" role="dialog" aria-modal="false" aria-label="Zenfest AI">
          <ZenfestChat variant="panel" onClose={close} />
        </div>
      )}
    </>
  )
}

/**
 * A link that opens the Zenfest AI chat in place (panel or full-screen) and falls
 * back to a normal link: /plan without JavaScript, /contact when the AI is off.
 */
export function AiLink(props: {
  className?: string
  children: React.ReactNode
  /** Shown instead (linking to /contact) when Zenfest AI is switched off; `false` hides the link. */
  fallback?: React.ReactNode
  prefill?: string
  /** Runs before the chat opens, e.g. to close the phone menu. */
  onOpen?: () => void
}) {
  const ai = useZenfestAIOptional()
  if (!ai?.enabled) {
    if (props.fallback === false) return null
    return (
      <Link className={props.className} href="/contact">
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
