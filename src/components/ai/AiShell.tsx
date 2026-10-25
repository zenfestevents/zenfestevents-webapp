'use client'

// Loads Zenfest AI's provider, chat bubble and homepage band only while the AI is on.
// next/dynamic splits them into their own chunks, fetched only when rendered, so with
// the AI off no page downloads the chat code (the AiLinks fall back to /enquire).
// The split needs a Client Component: a Server Component importing them directly ships
// them in the page bundle whether they render or not.
import dynamic from 'next/dynamic'
import React from 'react'

import type { AgentProfile } from '../../lib/ai/types'

const ZenfestAIProvider = dynamic(() => import('./ZenfestAIProvider').then((m) => m.ZenfestAIProvider))
const ChatLauncher = dynamic(() => import('./ChatLauncher').then((m) => m.ChatLauncher))
const MeetZenfestAIBand = dynamic(() => import('./MeetZenfestAI').then((m) => m.MeetZenfestAI))

export function AiShell(props: {
  enabled: boolean
  greeting: string
  whatsapp: string
  phone: string
  agents: AgentProfile[]
  children: React.ReactNode
}) {
  const { children, ...rest } = props
  if (!props.enabled) return <>{children}</>
  return (
    <ZenfestAIProvider {...rest}>
      {children}
      <ChatLauncher />
    </ZenfestAIProvider>
  )
}

/** The homepage band; the page renders it only while the AI is on. */
export function MeetZenfestAI(props: { headline: string; agents: AgentProfile[] }) {
  return <MeetZenfestAIBand {...props} />
}
