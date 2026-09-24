'use client'

import React from 'react'

type Options = readonly (readonly [string, string])[]

/** Empty inputs become `undefined` so Payload leaves the field unset. */
export function num(v: FormDataEntryValue | null) {
  return v ? Number(v) : undefined
}

export function str(v: FormDataEntryValue | null) {
  return (v as string) || undefined
}

export function Checkboxes({ name, legend, options }: { name: string; legend: string; options: Options }) {
  return (
    <fieldset className="field choice choice--grid">
      <legend className="field__label">{legend}</legend>
      {options.map(([v, l]) => (
        <label key={v} className="choice__option">
          <input type="checkbox" name={name} value={v} />
          <span>{l}</span>
        </label>
      ))}
    </fieldset>
  )
}

export function Radios({
  name,
  legend,
  options,
  required,
  onChange,
  hint,
  stacked,
}: {
  name: string
  legend: string
  options: Options
  required?: boolean
  onChange?: (value: string) => void
  /** Explanation under the question. */
  hint?: string
  /** One option per line (for long option labels). */
  stacked?: boolean
}) {
  return (
    <fieldset className={`field choice${stacked ? '' : ' choice--grid'}`}>
      <legend className="field__label">
        {legend}
        {required && ' *'}
      </legend>
      {hint && <span className="field__hint choice__hint">{hint}</span>}
      {options.map(([v, l]) => (
        <label key={v} className="choice__option">
          <input
            type="radio"
            name={name}
            value={v}
            required={required}
            onChange={onChange && ((e) => e.target.checked && onChange(v))}
          />
          <span>{l}</span>
        </label>
      ))}
    </fieldset>
  )
}
