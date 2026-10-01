'use client'

import { useSyncExternalStore } from 'react'

// Browser-only values read without setState-in-effect, and without a hydration
// mismatch: the server snapshot is a fixed placeholder.

const noopSubscribe = () => () => {}

/** Current time, rounded to `stepMs` and refreshed on that interval. Null on the server. */
export function useNow(stepMs = 30_000): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const t = setInterval(onChange, stepMs)
      return () => clearInterval(t)
    },
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => null,
  )
}

/** `window.location.origin`, or '' on the server. */
export function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => '',
  )
}

const LOCAL_EVENT = 'zf-local-storage'

/** Raw localStorage value for `key` (null if unset/unavailable), kept in sync across tabs. */
export function useLocalStorage(key: string): string | null {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('storage', onChange)
      window.addEventListener(LOCAL_EVENT, onChange)
      return () => {
        window.removeEventListener('storage', onChange)
        window.removeEventListener(LOCAL_EVENT, onChange)
      }
    },
    () => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    () => null,
  )
}

export function writeLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode / storage disabled — callers treat this as best effort.
  }
  window.dispatchEvent(new Event(LOCAL_EVENT))
}
