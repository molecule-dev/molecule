/**
 * Install the in-browser mock server into a page: replace `window.fetch` with
 * a {@link createFixtureFetch} instance and start a demo session the molecule
 * auth client restores on boot. Call it BEFORE the app's own code runs (a
 * static build imports it first in its entry).
 *
 * Browser-only: it reads `window`, `document` and `location`.
 */

import { createFixtureFetch, type FixtureFetch, type FixtureFetchOptions } from './fixture-fetch.js'

/** The session-presence hint the molecule auth client checks before restoring a session. */
export const SESSION_HINT_COOKIE = 'mol_auth'

/**
 * Whether the page runs inside a cross-site frame (where a cookie needs
 * `Secure; SameSite=None; Partitioned` to be stored at all).
 * @returns `true` when framed.
 */
function isFramed(): boolean {
  try {
    return window.self !== window.top
  } catch (_error) {
    // Some engines throw on `window.top` access from a cross-origin frame —
    // that itself means we are framed.
    return true
  }
}

/**
 * Set or clear the session-presence hint cookie. In a cross-site frame on
 * https it is written partitioned, the only form a third-party frame can keep.
 * @param signedIn - Whether the demo session is signed in.
 */
export function writeSessionHint(signedIn: boolean): void {
  const framed = isFramed() && location.protocol === 'https:'
  const attrs = `; path=/${framed ? '; Secure; SameSite=None; Partitioned' : '; SameSite=Lax'}`
  document.cookie = signedIn
    ? `${SESSION_HINT_COOKIE}=1${attrs}`
    : `${SESSION_HINT_COOKIE}=; Max-Age=0${attrs}`
}

/**
 * Replace `window.fetch` with the fixture fetch and start the demo session.
 * Idempotent per page: a second call returns the first instance.
 * @param options - Fixture set, persona and session options.
 * @returns The installed fixture fetch.
 */
export function installFixtureFetch(options: FixtureFetchOptions): FixtureFetch {
  const w = window as Window & { __moleculeFixtureFetch?: FixtureFetch }
  if (w.__moleculeFixtureFetch) return w.__moleculeFixtureFetch
  const realFetch = window.fetch.bind(window)
  const fixtureFetch = createFixtureFetch(
    {
      ...options,
      onSessionChange: (signedIn) => {
        writeSessionHint(signedIn)
        options.onSessionChange?.(signedIn)
      },
    },
    realFetch,
  )
  writeSessionHint(fixtureFetch.isSignedIn())
  window.fetch = fixtureFetch
  w.__moleculeFixtureFetch = fixtureFetch
  return fixtureFetch
}
