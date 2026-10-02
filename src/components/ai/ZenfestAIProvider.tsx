'use client'

// Holds the one Zenfest AI conversation for the whole site, so the chat survives
// page changes and is shared by the desktop panel, the phone full-screen view and
// /plan. Talks to POST /plan/chat (NDJSON stream) and the Server Actions in
// app/(frontend)/plan/actions.ts.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { loadChat, startChat } from '../../app/(frontend)/plan/actions'
import type { IntakeDetails } from '../../lib/ai/intake'
import type { AgentProfile, ChatItem, StreamEvent } from '../../lib/ai/types'

const STORE_KEY = 'zenfest-ai-chat'
/** This browser's recent chats, so "New chat" never loses an old one. */
const HISTORY_KEY = 'zenfest-ai-chats'
const HISTORY_MAX = 10

type Session = { conversationId: string; token: string }
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

const Ctx = createContext<ZenfestAIContext | null>(null)

export function useZenfestAI(): ZenfestAIContext {
  const v = useContext(Ctx)
  if (!v) throw new Error('useZenfestAI must be used inside ZenfestAIProvider')
  return v
}

/** Like useZenfestAI, but null outside the provider (for optional entry points). */
export const useZenfestAIOptional = () => useContext(Ctx)

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v.conversationId === 'string' && typeof v.token === 'string' ? v : null
  } catch {
    return null
  }
}

function writeSession(s: Session | null) {
  try {
    if (s) window.localStorage.setItem(STORE_KEY, JSON.stringify(s))
    else window.localStorage.removeItem(STORE_KEY)
  } catch {
    // Private mode etc.: the chat still works, it just won't survive a reload.
  }
}

function readHistory(): SavedChat[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(v)
      ? v.filter((c) => c && typeof c.conversationId === 'string' && typeof c.token === 'string').slice(0, HISTORY_MAX)
      : []
  } catch {
    return []
  }
}

function writeHistory(list: SavedChat[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)))
  } catch {
    // Not available: history just won't be kept.
  }
}

/** Adds or refreshes a chat at the top of the list (keeping its title if none given). */
function upsert(list: SavedChat[], s: Session, title?: string): SavedChat[] {
  const old = list.find((c) => c.conversationId === s.conversationId)
  const entry: SavedChat = { ...s, title: title || old?.title || 'Earlier chat', updatedAt: Date.now() }
  return [entry, ...list.filter((c) => c.conversationId !== s.conversationId)].slice(0, HISTORY_MAX)
}

/** The intake card (or submitContact's thank-you) marks a chat whose lead is saved. */
const leadSaved = (items: ChatItem[]) =>
  items.some((i) => i.kind === 'intake' || (i.kind === 'notice' && i.text.startsWith('Thank you,')))

let seq = 0
const uid = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`

export function ZenfestAIProvider(props: {
  enabled: boolean
  greeting: string
  whatsapp: string
  phone: string
  agents: AgentProfile[]
  children: React.ReactNode
}) {
  const { enabled, greeting, whatsapp, phone, agents } = props
  const [isOpen, setOpen] = useState(false)
  const [items, setItems] = useState<ChatItem[]>([])
  const [busy, setBusy] = useState(false)
  const [working, setWorking] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [contactDone, setContactDone] = useState<string | null>(null)
  const [intakeNote, setIntakeNote] = useState('')
  const [lastIntake, setLastIntake] = useState<IntakeDetails | null>(null)
  const [history, setHistory] = useState<SavedChat[]>([])
  const restored = useRef(false)
  const pendingPrefill = useRef<string | null>(null)

  // Restore the previous chat once, on first open (or when /plan mounts).
  const restore = useCallback(async () => {
    if (restored.current) return
    restored.current = true
    let list = readHistory()
    const s = readSession()
    // A chat from before history existed joins the list.
    if (s && !list.some((c) => c.conversationId === s.conversationId)) list = upsert(list, s)
    writeHistory(list)
    setHistory(list)
    if (!s) return
    setSession(s)
    try {
      const res = await loadChat(s.conversationId, s.token)
      if (res.ok) {
        setItems((cur) => (cur.length ? cur : res.items))
        if (leadSaved(res.items)) setContactDone('saved')
      } else {
        writeSession(null)
        setSession(null)
        const pruned = list.filter((c) => c.conversationId !== s.conversationId)
        writeHistory(pruned)
        setHistory(pruned)
      }
    } catch {
      // Network hiccup: start fresh but keep the stored session for next time.
    }
  }, [])

  const switchTo = useCallback<ZenfestAIContext['switchTo']>(
    async (conversationId) => {
      if (busy) return null
      const list = readHistory()
      const target = list.find((c) => c.conversationId === conversationId)
      if (!target) return 'That chat is no longer available.'
      const res = await loadChat(target.conversationId, target.token).catch(() => null)
      if (!res?.ok) {
        // Gone on the server (deleted / expired): drop it from the list.
        const pruned = list.filter((c) => c.conversationId !== conversationId)
        writeHistory(pruned)
        setHistory(pruned)
        return 'That chat is no longer available.'
      }
      const s = { conversationId: target.conversationId, token: target.token }
      writeSession(s)
      setSession(s)
      setItems(res.items)
      setContactDone(leadSaved(res.items) ? 'saved' : null)
      setDraft('')
      return null
    },
    [busy],
  )

  /** POSTs to /plan/chat and renders the streamed events. */
  const stream = useCallback(
    async (body: Record<string, unknown>) => {
      // The Zenfest bubble currently being streamed into; closed by any card.
      let openId: string | null = null
      const push = (item: ChatItem) => {
        openId = null
        setItems((cur) => [...cur, item])
      }
      const handle = (e: StreamEvent) => {
        switch (e.type) {
          case 'session': {
            const s = { conversationId: e.conversationId, token: e.token }
            writeSession(s)
            setSession(s)
            break
          }
          case 'text': {
            if (openId) {
              const id = openId
              setItems((cur) => cur.map((i) => (i.id === id && i.kind === 'assistant' ? { ...i, text: i.text + e.delta } : i)))
            } else {
              const id = uid()
              setItems((cur) => [...cur, { kind: 'assistant', id, text: e.delta }])
              openId = id
            }
            break
          }
          case 'specialist_start':
            openId = null
            setWorking((w) => [...w, `${e.emoji} ${e.agentName}`])
            break
          case 'specialist_result':
            setWorking((w) => {
              const label = `${e.card.emoji} ${e.card.agentName}`
              const i = w.indexOf(label)
              return i < 0 ? w : [...w.slice(0, i), ...w.slice(i + 1)]
            })
            push({ kind: 'specialist', id: uid(), card: e.card })
            break
          case 'contact_request':
            push({ kind: 'contact', id: uid(), reason: e.reason })
            break
          case 'handoff':
            push({ kind: 'handoff', id: uid(), reason: e.reason })
            break
          case 'notice':
            push({ kind: 'notice', id: uid(), text: e.text })
            if (e.showContact) push({ kind: 'contact', id: uid(), reason: '' })
            break
          case 'error':
            push({ kind: 'notice', id: uid(), text: e.message })
            break
          case 'done':
            break
        }
      }

      try {
        const res = await fetch('/plan/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => null)
          push({ kind: 'notice', id: uid(), text: j?.error || 'Zenfest AI is unavailable right now. Please try again.' })
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let nl: number
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim()
            buf = buf.slice(nl + 1)
            if (!line) continue
            try {
              handle(JSON.parse(line) as StreamEvent)
            } catch {
              // ignore a malformed line
            }
          }
        }
      } catch {
        push({ kind: 'notice', id: uid(), text: 'Connection lost. Please try again.' })
      } finally {
        setWorking([])
        setBusy(false)
      }
    },
    [],
  )

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || busy) return
      setBusy(true)
      setDraft('')
      setItems((cur) => [...cur, { kind: 'user', id: uid(), text }])
      const s = session ?? readSession()
      await stream({ message: text, conversationId: s?.conversationId, token: s?.token })
      if (s) {
        const list = upsert(readHistory(), s)
        writeHistory(list)
        setHistory(list)
      }
    },
    [busy, session, stream],
  )

  const startWithIntake = useCallback<ZenfestAIContext['startWithIntake']>(
    async (intake) => {
      if (busy) return null
      setBusy(true)
      const res = await startChat(intake).catch(() => ({ ok: false as const, error: 'Connection lost. Please try again.' }))
      if (!res.ok) {
        setBusy(false)
        return res.error
      }
      const s = { conversationId: res.conversationId, token: res.token }
      writeSession(s)
      setSession(s)
      const list = upsert(readHistory(), s, res.title)
      writeHistory(list)
      setHistory(list)
      setItems(res.items)
      setContactDone('saved')
      setIntakeNote('')
      setLastIntake(intake)
      restored.current = true
      await stream({ kickoff: true, ...s })
      return null
    },
    [busy, stream],
  )

  const open = useCallback(
    (prefill?: string) => {
      const text = prefill?.trim()
      // No chat yet: the text goes straight into the intake form's notes (set together
      // with opening, so the form mounts with it). Ongoing chat: sent once it's restored.
      if (text && !session && !readSession()) setIntakeNote(text)
      else if (text) pendingPrefill.current = text
      setOpen(true)
      void restore()
    },
    [restore, session],
  )

  // Text typed in the homepage band: sent as a message in an ongoing chat, otherwise
  // carried into the intake form's notes (a new chat starts with the form).
  useEffect(() => {
    if (!isOpen || !pendingPrefill.current || busy) return
    const text = pendingPrefill.current
    pendingPrefill.current = null
    if (session) void send(text)
    else setIntakeNote(text)
  }, [isOpen, busy, send, session])

  const reset = useCallback(() => {
    writeSession(null)
    setSession(null)
    setItems([])
    setContactDone(null)
    setDraft('')
  }, [])

  const value = useMemo<ZenfestAIContext>(
    () => ({
      enabled,
      greeting,
      whatsapp,
      phone,
      isOpen,
      open,
      close: () => setOpen(false),
      items,
      busy,
      working,
      draft,
      setDraft,
      send,
      session,
      contactDone,
      markContactDone: setContactDone,
      reset,
      restore,
      agents,
      intakeNote,
      startWithIntake,
      lastIntake,
      history,
      switchTo,
    }),
    [
      enabled,
      greeting,
      whatsapp,
      phone,
      isOpen,
      open,
      items,
      busy,
      working,
      draft,
      send,
      session,
      contactDone,
      reset,
      restore,
      agents,
      intakeNote,
      startWithIntake,
      lastIntake,
      history,
      switchTo,
    ],
  )

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}
