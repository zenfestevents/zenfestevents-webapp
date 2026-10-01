'use client'

import React from 'react'

import { useNow } from './useClient'

/** Days / hours / minutes to the event; "Today" on the day, nothing after. */
export function Countdown({ date }: { date: string }) {
  const target = new Date(date).getTime()
  const now = useNow(30_000)

  // Nothing on the server, so the numbers never mismatch on hydration.
  if (now === null || Number.isNaN(target)) return <div className="reg-countdown" aria-hidden="true" />

  const diff = target - now
  const sameDay = new Date(target).toDateString() === new Date(now).toDateString()
  if (sameDay) return <p className="reg-countdown reg-countdown--today">The celebration is today</p>
  if (diff < 0) return null

  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  const units: [number, string][] = [
    [days, days === 1 ? 'day' : 'days'],
    [hours, hours === 1 ? 'hour' : 'hours'],
    [mins, 'min'],
  ]

  return (
    <div className="reg-countdown" role="timer" aria-label={`${units[0][0]} ${units[0][1]}, ${units[1][0]} ${units[1][1]} to go`}>
      {units.map(([n, label]) => (
        <span key={label} className="reg-countdown__unit">
          <strong>{n}</strong>
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}
