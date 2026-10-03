'use client'

import React, { useMemo } from 'react'

import { MonthCalendar } from './MonthCalendar'

/** Read-only availability for a public listing (two months, scrollable forward). */
export function MonthCalendarStatic({ blocked }: { blocked: string[] }) {
  const set = useMemo(() => new Set(blocked), [blocked])
  return <MonthCalendar blocked={set} months={2} />
}
