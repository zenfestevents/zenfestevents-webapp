'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import type { ReferralFriend } from '../../lib/rewards'
import { BallDots } from '../game'

const inr = (n: number) => n.toLocaleString('en-IN')

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * Live progress for each person you invited: one ball per stage, the one they're at
 * ringed. The data is the server's (lib/rewards.ts getReferrals); while the page is
 * open and visible it asks the server again every 60 s, so a booking shows up live.
 */
export function ReferralTracker({ friends, stages }: { friends: ReferralFriend[]; stages: { client: readonly string[]; vendor: readonly string[] } }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 60_000)
    return () => clearInterval(t)
  }, [router])

  if (!friends.length) {
    return <p className="muted">Yet to bat: share a link above to get your first invite on the board.</p>
  }
  return (
    <ol className="tracker">
      {friends.map((f, i) => {
        const track = f.type === 'client' ? stages.client : stages.vendor
        return (
          <li key={`${f.name}-${i}`} className={`tracker__row ${f.ended ? 'is-ended' : ''} ${f.step === f.steps && !f.ended ? 'is-won' : ''}`}>
            <div className="tracker__who">
              <strong>{f.name}</strong>
              <span className={`tracker__tag tracker__tag--${f.type}`}>{f.type === 'client' ? 'Client' : 'Vendor'}</span>
            </div>
            <div className="tracker__progress">
              <BallDots
                total={f.steps}
                done={f.ended ? 0 : f.step}
                current={f.ended ? undefined : f.step - 1}
                label={`${f.label}: stage ${f.step} of ${f.steps} (${track.join(', ')})`}
              />
              <span className="tracker__stage">{f.label}</span>
            </div>
            <span className="tracker__when mono" suppressHydrationWarning>
              {ago(f.updatedAt)}
            </span>
            <span className="tracker__runs mono">{f.runs ? `+${inr(f.runs)}` : '—'}</span>
          </li>
        )
      })}
    </ol>
  )
}
