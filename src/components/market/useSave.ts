'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ActionResult = { ok: true } | { ok: false; error: string; login?: boolean }

/**
 * Busy / error / "Saved" state around a Server Action call. A `login` failure
 * (session ended) sends the person to log in and come back.
 */
export function useSave(loginPath = '/account/login') {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function run<T extends ActionResult>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const res = await fn()
      if (!res.ok) {
        if ('login' in res && res.login) {
          router.push(`${loginPath}?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
          return res
        }
        setError(res.error)
        return res
      }
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
      return res
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      return null
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, saved, run, setError }
}

/** "Saved ✓" / error line under a form. */
export function statusText(s: { error: string; saved: boolean }) {
  return s.error || (s.saved ? 'Saved ✓' : '')
}
