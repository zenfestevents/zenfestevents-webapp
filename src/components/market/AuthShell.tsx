import React from 'react'

/** Two-column frame for the sign-up / log-in pages: pitch on the left, form card on the right. */
export function AuthShell({
  eyebrow,
  title,
  lede,
  points,
  formTitle,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  lede: string
  points?: readonly (readonly [string, string])[]
  formTitle: string
  children: React.ReactNode
}) {
  return (
    <section className="section auth-page">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-l">{title}</h1>
          <p className="lede">{lede}</p>
          {points && (
            <div className="vendor-perks">
              {points.map(([t, body]) => (
                <div key={t} className="vendor-perk">
                  <strong>{t}</strong>
                  <span className="muted">{body}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="contact-form-wrap card">
          <h2 className="display-m">{formTitle}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export const param = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
