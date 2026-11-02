'use client'

import React from 'react'
import { useField, useFormFields } from '@payloadcms/ui'

import { ALSO_SUITS_CHOICES, DECOR_EVENT_GROUPS, eventTypeLabel } from '../../../lib/decorOptions'

/**
 * "Also suits" tick-list: the other events a decoration works for, grouped like the Event type
 * dropdown. The main event is left out (it is already chosen). Shared by the decoration form
 * and Quick add.
 */
export function AlsoSuitsChecklist({
  value,
  onChange,
  main,
}: {
  value: string[]
  onChange: (next: string[]) => void
  main: string
}) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="zf-alsosuits">
      {DECOR_EVENT_GROUPS.map((g) => {
        const events = g.values.filter((v) => ALSO_SUITS_CHOICES.includes(v) && v !== main)
        if (!events.length) return null
        return (
          <fieldset key={g.label}>
            <legend>{g.label}</legend>
            <div>
              {events.map((v) => (
                <label key={v}>
                  <input type="checkbox" checked={value.includes(v)} onChange={() => toggle(v)} />
                  <span>{eventTypeLabel(v)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}

/** The Also suits field on a decoration (replaces Payload's type-and-press-Enter tag box). */
export function DecorAlsoSuitsField({ path = 'alsoSuits' }: { path?: string }) {
  const { value, setValue, showError, errorMessage } = useField<string[] | null>({ path })
  const main = useFormFields(([fields]) => String(fields.eventType?.value ?? ''))
  const chosen = (Array.isArray(value) ? value : []).filter((v) => v !== main)
  return (
    <div className={`field-type zf-alsosuits-field${showError ? ' error' : ''}`}>
      <span className="field-label">Also suits (other events)</span>
      <AlsoSuitsChecklist value={chosen} onChange={(next) => setValue(next)} main={main} />
      <p className="zf-photos__hint">
        Tick the other events this same decoration works for (for example a reception stage that also suits Engagement). It
        will show on the website under each of them. The item code stays with the main event.
      </p>
      {showError && errorMessage ? (
        <ul className="zf-photos__errors" role="alert">
          <li>{errorMessage}</li>
        </ul>
      ) : null}
    </div>
  )
}
