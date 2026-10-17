/**
 * The browser `StorageAdapter` for the auth client's token storage.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

import type { StorageAdapter } from './types.js'

/**
 * Which Web Storage area {@link createBrowserStorageAdapter} persists to:
 * `'local'` is `window.localStorage` (survives a reload AND the tab closing),
 * `'session'` is `window.sessionStorage` (survives a reload, dies with the tab).
 */
export type BrowserStorageKind = 'local' | 'session'

/** How {@link createBrowserStorageAdapter} picks the store it writes to. */
export interface BrowserStorageAdapterOptions {
  /**
   * The Web Storage area to persist to (default `'local'`).
   *
   * `'session'` is the narrower choice: a reload keeps the session, closing the
   * tab ends it. Pick it when the app only has to survive navigations within one
   * session — which is all a `page.reload()` asks for.
   */
  kind?: BrowserStorageKind
  /**
   * A store to use instead of resolving `window.localStorage` /
   * `window.sessionStorage` (a test double, a namespaced wrapper, or the
   * `Storage` object another library exposes). Anything with `getItem`/
   * `setItem`/`removeItem` does.
   */
  storage?: StorageAdapter
}

/** Best-effort logger: a missing logger bond must never break token storage. */
const warn = (message: string, error?: unknown): void => {
  try {
    const logger = getLogger('auth')
    if (error === undefined) logger.warn(message)
    else logger.warn(message, { error })
  } catch (_error) {
    // No logger bonded (a bare unit test, an SSR boot before the app's bonds):
    // logging is not this adapter's contract, and throwing here would take the
    // session down with it.
  }
}

/**
 * The auth client's `StorageAdapter` over the browser's Web Storage.
 *
 * Pass it as `AuthClientConfig.storage` to keep the session across a page reload:
 * the client's default (`'memory'`) is lost on reload, and re-establishing the
 * session then needs a credential that survived — this adapter, or an httpOnly
 * session cookie the API sets (see the security note below).
 *
 * ```ts
 * import { createJWTAuthClient, createBrowserStorageAdapter } from '@molecule/app-auth'
 *
 * const authClient = createJWTAuthClient({
 *   baseURL: '/api',
 *   storage: createBrowserStorageAdapter(), // a reload keeps the user signed in
 * })
 * ```
 *
 * The scaffold's `authConfig` already passes it, so a scaffolded app survives a
 * reload out of the box; each of these replaces that default:
 *
 * ```ts
 * storage: 'memory' // memory only: pair it with an httpOnly cookie session
 * storage: createBrowserStorageAdapter({ kind: 'session' }) // survives a reload, dies with the tab
 * storage: { getItem: (k) => …, setItem: (k, v) => …, removeItem: (k) => … } // your own
 * ```
 *
 * @remarks
 * - **The trade, stated plainly.** A bearer token in Web Storage is readable by
 *   any script on the origin, so one XSS is one token theft — an account takeover
 *   for the token's whole lifetime, and `localStorage` keeps the copy after the
 *   tab closes. This is the model the RealWorld suite's own specs write
 *   (`localStorage.setItem('jwtToken', …)` before a reload) and the reason this
 *   adapter exists.
 * - **An httpOnly cookie session is STRONGER, and is the first choice wherever
 *   your API supports it.** Script cannot read an httpOnly cookie, so an XSS
 *   cannot exfiltrate the credential; the token stays in memory and
 *   `initialize()` restores the session through `currentUserEndpoint`
 *   (`@molecule/api-resource-user` issues exactly this cookie — that is why the
 *   client's default is `'memory'`). If the API sets one, `storage: 'memory'` is
 *   the strongest configuration. If it does not and you cannot change it, keep
 *   the token's lifetime short and rotate it on refresh.
 * - **`kind: 'session'` narrows the window** to the tab's lifetime at the cost of
 *   losing the session in a new tab; `'local'` is the default because a reload is
 *   the requirement it exists for, and a fresh tab is the same person.
 * - **Unavailable storage degrades to memory; it never throws.** SSR (`window`
 *   undefined), a private/blocked store and a full quota all fall back to a
 *   process-local store — so a login still succeeds and the session simply does
 *   not survive the next page load. A warning names the failure. Do not read a
 *   successful `setItem` as a guarantee of persistence; a caller that needs one
 *   must probe the store itself.
 * - **The keys are the client's own** (`storagePrefix`, default
 *   `molecule:auth:`, plus `accessToken` / `refreshToken` / `user`); this adapter
 *   adds no prefix and stores nothing of its own.
 *
 * @param options - Which Web Storage area to use, or a store to use directly.
 * @returns A synchronous `StorageAdapter` bound to that store.
 */
export const createBrowserStorageAdapter = (
  options: BrowserStorageAdapterOptions = {},
): StorageAdapter => {
  const { kind = 'local', storage } = options
  // The fallback store: one Map per adapter, so an unusable Web Storage area
  // still behaves like a store for the lifetime of the page.
  const memory = new Map<string, string>()
  /** The store once it has answered, `null` while it is unusable (re-probed each call). */
  let resolved: StorageAdapter | null | undefined
  /** The unusable-store warning is worth saying once, not on every token read. */
  let warned = false

  const resolve = (): StorageAdapter | null => {
    if (storage) return storage
    if (resolved !== undefined && resolved !== null) return resolved
    try {
      const areas = globalThis as unknown as Record<string, StorageAdapter | undefined>
      const web = kind === 'session' ? areas.sessionStorage : areas.localStorage
      if (web) {
        // A store can be PRESENT and still unusable (a blocked third-party
        // context, a private mode): touching it throws, so probe before trusting it.
        const probe = '__molecule_auth_probe__'
        web.setItem(probe, probe)
        web.removeItem(probe)
        resolved = web
        return web
      }
    } catch (error) {
      if (!warned) {
        warned = true
        warn(`The ${kind} Web Storage area is not usable; keeping auth tokens in memory`, error)
      }
    }
    // Not cached: a store that appears later (the app booting before its DOM is
    // ready) is still picked up by the next call.
    return null
  }

  return {
    getItem: (key) => {
      const store = resolve()
      if (!store) return memory.get(key) ?? null
      try {
        // A write that fell back to memory (a full or blocked store) is still
        // this session's value: the store simply never received it.
        return store.getItem(key) ?? memory.get(key) ?? null
      } catch (error) {
        warn('Reading a stored auth value failed; falling back to memory', error)
        return memory.get(key) ?? null
      }
    },
    setItem: (key, value) => {
      const store = resolve()
      if (!store) {
        memory.set(key, value)
        return
      }
      try {
        store.setItem(key, value)
        memory.delete(key)
      } catch (error) {
        // A quota-full or blocked store must not fail a login: keep the value for
        // this page's lifetime and say so. The session is lost on reload, which is
        // the state the app was in before this adapter existed.
        warn('Storing an auth value failed; keeping it in memory for this page', error)
        memory.set(key, value)
      }
    },
    removeItem: (key) => {
      memory.delete(key)
      const store = resolve()
      if (!store) return
      try {
        store.removeItem(key)
      } catch (error) {
        warn('Clearing a stored auth value failed', error)
      }
    },
  }
}
