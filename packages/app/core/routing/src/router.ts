/**
 * The routers this package provides itself: one over the browser's History API and one
 * in memory. Both are a {@link RouterHistory} handed to {@link createHistoryRouter}, the
 * same construction every routing bond uses.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

import { createHistoryRouter, parseLocation } from './history-router.js'
import type {
  NavigationAction,
  RouteLocation,
  Router,
  RouterConfig,
  RouterHistory,
} from './types.js'

const newKey = (): string => Math.random().toString(36).slice(2)

/** Listener bookkeeping shared by the two histories below. */
const createEmitter = (): {
  listen: RouterHistory['listen']
  emit: (action: NavigationAction) => void
  clear: () => void
} => {
  const listeners = new Set<(action?: NavigationAction) => void>()
  return {
    listen(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit: (action) => {
      for (const listener of [...listeners]) listener(action)
    },
    clear: () => listeners.clear(),
  }
}

/**
 * The browser's History API as a {@link RouterHistory}: `history` mode keeps the path in
 * the URL's pathname (under `basePath`), `hash` mode in its hash (`#/users?x=1`).
 *
 * @param config - Mode and base path.
 * @returns The history.
 */
const createBrowserRouterHistory = (config: RouterConfig): RouterHistory => {
  const logger = getLogger('routing')
  const { mode = 'history', basePath = '' } = config
  const emitter = createEmitter()
  let key = newKey()
  let lastHref = typeof window === 'undefined' ? '' : window.location.href

  const location = (): RouteLocation => {
    if (mode === 'hash') {
      return { ...parseLocation(window.location.hash.slice(1) || '/', window.history.state), key }
    }
    const { pathname, search, hash } = window.location
    const inBase = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    return {
      pathname: inBase ? pathname.slice(basePath.length) || '/' : pathname,
      search,
      hash,
      state: window.history.state,
      key,
    }
  }

  const write = (path: string, state: unknown, action: 'push' | 'replace'): void => {
    logger.debug('Navigating', path)
    const url = mode === 'hash' ? `#${path}` : basePath + path
    if (action === 'replace') window.history.replaceState(state ?? null, '', url)
    else window.history.pushState(state ?? null, '', url)
    key = newKey()
    lastHref = window.location.href
    emitter.emit(action)
  }

  // Back/forward (and a hand-edited hash): one notification per changed URL, though the
  // browser fires both popstate and hashchange for a hash move. Listened to for the
  // router's whole life, so the location key changes with every entry.
  const onPop = (): void => {
    if (window.location.href === lastHref) return
    lastHref = window.location.href
    key = newKey()
    emitter.emit('pop')
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', onPop)
    if (mode === 'hash') window.addEventListener('hashchange', onPop)
  }

  return {
    location,
    push: (path, state) => write(path, state, 'push'),
    replace: (path, state) => write(path, state, 'replace'),
    go: (delta) => window.history.go(delta),
    listen: emitter.listen,
    destroy() {
      emitter.clear()
      if (typeof window === 'undefined') return
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    },
  }
}

/**
 * An in-memory history: a list of entries and a position in it.
 *
 * @param initialEntries - The starting entries; the last one is current.
 * @returns The history.
 */
const createMemoryRouterHistory = (initialEntries: string[]): RouterHistory => {
  const emitter = createEmitter()
  const entries: RouteLocation[] = (initialEntries.length ? initialEntries : ['/']).map(
    (entry) => ({ ...parseLocation(entry), key: newKey() }),
  )
  let index = entries.length - 1

  return {
    location: () => entries[index],
    push(path, state) {
      entries.splice(index + 1)
      entries.push({ ...parseLocation(path, state), key: newKey() })
      index = entries.length - 1
      emitter.emit('push')
    },
    replace(path, state) {
      entries[index] = { ...parseLocation(path, state), key: newKey() }
      emitter.emit('replace')
    },
    go(delta) {
      const next = index + delta
      if (delta === 0 || next < 0 || next >= entries.length) return
      index = next
      emitter.emit('pop')
    },
    listen: emitter.listen,
    destroy: emitter.clear,
  }
}

/**
 * Creates a browser history-based router using the History API
 * (or hash mode). Supports navigation guards, named routes,
 * and route change subscriptions.
 *
 * @param config - Router configuration (mode, basePath, initial routes).
 * @returns A `Router` instance bound to the browser history.
 */
export const createBrowserRouter = (config: RouterConfig = {}): Router =>
  createHistoryRouter(createBrowserRouterHistory(config), { routes: config.routes })

/**
 * Creates an in-memory router for testing and SSR environments.
 * Maintains a synthetic history stack without touching browser APIs.
 *
 * @param config - Router configuration with optional `initialEntries` for the history stack.
 * @returns A `Router` instance backed by an in-memory history.
 */
export const createMemoryRouter = (
  config: RouterConfig & { initialEntries?: string[] } = {},
): Router =>
  createHistoryRouter(createMemoryRouterHistory(config.initialEntries ?? ['/']), {
    routes: config.routes,
  })
