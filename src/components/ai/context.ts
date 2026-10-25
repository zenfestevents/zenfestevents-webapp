'use client'

// The Zenfest AI context on its own, so the entry points every page shows (AiLink in the
// header and hero, the bottom bar) don't pull the provider and chat code into the bundle.
// The provider itself loads only while Zenfest AI is on (see AiShell.tsx).
import { createContext, useContext } from 'react'

import type { IntakeDetails } from '../../lib/ai/intake'
import type { AgentProfile, ChatItem } from '../../lib/ai/types'

export type Session = { conversationId: string; token: string }
export type SavedChat = Session & { title: string; updatedAt: number }

export type ZenfestAIContext = {
  enabled: boolean
  greeting: string
  whatsapp: string
  phone: string
  isOpen: boolean
  open: (prefill?: string) => void
  close: () => void
  items: ChatItem[]
  busy: boolean
  /** Specialists working right now, e.g. ["🎨 Zenfest Décor"]. */
  working: string[]
  draft: string
  setDraft: (v: string) => void
  send: (text: string) => Promise<void>
  session: Session | null
  contactDone: string | null
  markContactDone: (message: string) => void
  reset: () => void
  /** Loads the stored chat (once); /plan calls it on mount. */
  restore: () => Promise<void>
  /** Specialists the intake form offers as services. */
  agents: AgentProfile[]
  /** Text typed in the homepage band before the form was filled in (goes into its notes). */
  intakeNote: string
  /** Sends the intake form, opens the chat and lets Zenfest reply first. Returns an error message or null. */
  startWithIntake: (intake: IntakeDetails & { consent: boolean; company?: string }) => Promise<string | null>
  /** The last intake sent from this page (prefills name/phone after "New chat"). */
  lastIntake: IntakeDetails | null
  /** This browser's recent chats, newest first. */
  history: SavedChat[]
  /** Opens one of `history`. Returns an error message or null. */
  switchTo: (conversationId: string) => Promise<string | null>
}

export const ZenfestAICtx = createContext<ZenfestAIContext | null>(null)

export function useZenfestAI(): ZenfestAIContext {
  const v = useContext(ZenfestAICtx)
  if (!v) throw new Error('useZenfestAI must be used inside ZenfestAIProvider')
  return v
}

/** Like useZenfestAI, but null outside the provider (for optional entry points). */
export const useZenfestAIOptional = () => useContext(ZenfestAICtx)
