'use client'

// Homepage band right under the hero: introduces Zenfest AI and its specialist team,
// and starts the chat with whatever the visitor types.
import Link from 'next/link'
import React, { useState } from 'react'

import type { AgentProfile } from '../../lib/ai/types'
import { useZenfestAI } from './ZenfestAIProvider'

export function MeetZenfestAI({ headline, agents }: { headline: string; agents: AgentProfile[] }) {
  const { open } = useZenfestAI()
  const [text, setText] = useState('')

  const start = (e: React.FormEvent) => {
    e.preventDefault()
    open(text)
    setText('')
  }

  // Accent the last two words in gold, like the other section headings.
  const words = headline.trim().split(/\s+/)
  const head = words.slice(0, -2).join(' ')
  const tail = words.slice(-2).join(' ')

  return (
    <section className="section band-ink zai-band" aria-labelledby="zai-band-title">
      <div className="container zai-band__inner">
        <div className="zai-band__copy">
          <p className="eyebrow">
            <span className="zai-band__badge">✦ AI-enabled</span> Meet Zenfest AI
          </p>
          <h2 id="zai-band-title" className="display-l">
            {head} <span className="accent">{tail}</span>
          </h2>
          <p className="lede">
            Tell Zenfest what you&apos;re celebrating. It brings in a dedicated AI specialist for each service, drafts your
            plan with estimates, and hands it to our team to confirm.
          </p>
          <form className="zai-band__ask" onSubmit={start}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Wedding reception for 300 guests in Tambaram"
              aria-label="Tell Zenfest AI about your event"
              maxLength={1500}
            />
            <button type="submit" className="btn btn--primary">
              Plan with Zenfest AI
            </button>
          </form>
          <p className="zai-band__fine">
            Free to use · Estimates only, our team confirms every price · <Link href="/plan">Open full screen</Link>
          </p>
        </div>

        <ol className="zai-team" aria-label="The Zenfest AI team">
          <li className="zai-team__lead">
            <span className="zai-team__emoji" aria-hidden="true">
              ✦
            </span>
            <span>
              <strong>Zenfest</strong>
              <small>Lead planner · coordinates the team</small>
            </span>
          </li>
          {agents.map((a) => (
            <li key={a.slug}>
              <span className="zai-team__emoji" aria-hidden="true">
                {a.emoji}
              </span>
              <span>
                <strong>{a.name}</strong>
                <small>{a.service} specialist</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
