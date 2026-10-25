'use client'

// Zenfest AI on every page. Desktop (≥900px): a gold bubble bottom-right that opens a
// side panel. Phones: no bubble (it would cover content and the bottom bar) — the
// bar's "Ask Zenfest AI" button opens the same chat full-screen. Both hidden on the
// registry pages and on /plan, which shows the chat itself. Loaded only while the AI is
// on (AiShell.tsx); the links that open it are in AiLink.tsx.
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

import { hidesChatLauncher } from './AiLink'
import { useZenfestAI } from './context'
import { ZenfestChat } from './ZenfestChat'

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
