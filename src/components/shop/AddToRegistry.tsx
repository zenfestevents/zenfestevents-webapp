'use client'

import React, { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'

import { addProductToRegistry } from '../../app/(frontend)/registry/actions'
import { useLocalStorage, writeLocalStorage } from '../registry/useClient'

/**
 * The registry the host is shopping for, set by "Pick gifts from the Zenfest
 * Shop" on their registry dashboard. Registries have no accounts — the manage
 * key is the login — so it lives only in this browser.
 */
export const REGISTRY_HOST_KEY = 'zenfest-registry-host'
export type RegistryHost = { slug: string; key: string; title: string }

function parseHost(raw: string | null): RegistryHost | null {
  try {
    const v = JSON.parse(raw || 'null')
    return v && typeof v.slug === 'string' && typeof v.key === 'string' ? v : null
  } catch {
    return null
  }
}

/** Remembers (or with null, forgets) the registry this browser is shopping for. */
export function saveRegistryHost(host: RegistryHost | null) {
  writeLocalStorage(REGISTRY_HOST_KEY, host ? JSON.stringify(host) : '')
}

/** "Add to my registry" on a product page. */
export function AddToRegistry({ productId }: { productId: number }) {
  const raw = useLocalStorage(REGISTRY_HOST_KEY)
  const host = useMemo(() => parseHost(raw), [raw])
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function add() {
    if (!host) {
      setOpen((v) => !v)
      return
    }
    setError('')
    start(async () => {
      const res = await addProductToRegistry(host.slug, host.key, productId)
      if (res.ok) setDone(res.already ? 'Already on your registry.' : 'Added to your registry.')
      else {
        setError(res.error)
        if (/manage link/i.test(res.error)) saveRegistryHost(null)
      }
    })
  }

  return (
    <div className="sp-registry">
      <button type="button" className="btn btn--ghost sp-registry__btn" onClick={add} disabled={pending}>
        {pending ? 'Adding…' : host ? `🎁 Add to “${host.title}”` : '🎁 Add to my gift registry'}
      </button>
      {done && (
        <p className="sp-registry__note" role="status">
          ✓ {done}{' '}
          <Link href={`/dashboard/${host?.slug}?key=${encodeURIComponent(host?.key ?? '')}`} rel="noreferrer">
            Open my registry
          </Link>
        </p>
      )}
      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
      {host && !done && (
        <p className="sp-registry__note muted">
          Adding to {host.title}.{' '}
          <button
            type="button"
            className="auth__linkbtn"
            onClick={() => saveRegistryHost(null)}
          >
            Not you?
          </button>
        </p>
      )}
      {!host && open && (
        <div className="sp-registry__help card">
          <p>
            <strong>Have a registry?</strong> Open your registry dashboard (the manage link you saved) and tap{' '}
            <em>“Pick gifts from the Zenfest Shop”</em>. Then every product shows an “Add” button for it.
          </p>
          <p>
            <strong>No registry yet?</strong> It&apos;s free and takes two minutes.
          </p>
          <Link className="btn btn--primary" href="/registry/create">
            Create a gift registry
          </Link>
        </div>
      )}
    </div>
  )
}
