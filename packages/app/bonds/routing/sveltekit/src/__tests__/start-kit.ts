/**
 * Starts SvelteKit's real client router over the test app (`./kit-app`), the way kit's
 * own page boot does: kit's generated client manifest handed to kit's `start`. Kit keeps
 * its router in module state, listens on `window`, `document` and `<html>` (its link
 * container), and in development wraps `history.pushState`/`replaceState` to warn about
 * direct calls. So every start resets the module registry first (a fresh kit client and
 * test app) and records every listener added while kit starts, and `stop` removes them and
 * puts the history methods back: a stopped app would otherwise still follow the next app's
 * clicks and popstates.
 *
 * @module
 */

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { inject, vi } from 'vitest'

import type { KitApp } from './kit-app/src/lib/started.js'

declare module 'vitest' {
  export interface ProvidedContext {
    /** Where kit wrote the test app's generated files for this project. */
    kitOutDir: string
    /** The base path this project's kit is built with. */
    kitBase: '' | '/app'
    /** Whether this project's kit uses hash routing. */
    kitHash: boolean
  }
}

/** The base path this project's kit is built with. */
export const kitBase = inject('kitBase')

/** Whether this project's kit uses hash routing. */
export const kitHash = inject('kitHash')

/**
 * The document URL for an in-app path under this project's kit.
 *
 * @param path - The in-app path.
 * @returns The URL with the base, or the `#` fragment under hash routing.
 */
export const documentUrl = (path: string): string =>
  kitHash ? `${kitBase}/#${path}` : kitBase + path

/**
 * The in-app path of the document URL, the way kit reads its route from it.
 *
 * @returns The pathname, search and hash within the app.
 */
export const inAppPath = (): string => {
  const { pathname, search, hash } = window.location
  if (kitHash) return hash.slice(1) || '/'
  const inApp = pathname.startsWith(`${kitBase}/`)
    ? pathname.slice(kitBase.length)
    : kitBase
      ? '/'
      : pathname
  return inApp + search + hash
}

/**
 * The in-app location of the document URL, parsed: its pathname, query string and
 * hash as kit reads them. Under hash routing the query and hash live inside the
 * URL's fragment, so a case that asks what the browser shows reads them here, not
 * from `window.location.search`/`.hash`.
 *
 * @returns The in-app location.
 */
export const inAppUrl = (): URL => new URL(inAppPath(), 'http://localhost')

/** How long a native move may take before the case reads the result anyway (and fails). */
const NATIVE_MOVE_TIMEOUT_MS = 5000

/** Lets a macrotask run. */
const macrotask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Waits until every `goto` the router started has finished and kit has no
 * navigation in flight, so a case reads the location kit committed.
 *
 * @param app - The started test app.
 */
export const settle = async (app: KitApp): Promise<void> => {
  for (let i = 0; i < 500 && !app.idle(); i++) await macrotask()
}

/**
 * Runs `move` and resolves once kit moved its page (the router's notification) and finished
 * the navigation, or after {@link NATIVE_MOVE_TIMEOUT_MS} when it started none. Kit resolves a
 * link's or a popstate's route before it marks the navigation in flight, so waiting for kit
 * to be idle alone could read the URL before the move began.
 *
 * @param app - The started test app.
 * @param move - The click or history move.
 */
export const awaitNavigation = async (app: KitApp, move: () => void): Promise<void> => {
  let stop = (): void => {}
  const navigated = new Promise<void>((resolve) => {
    stop = app.navigation.onNavigate(() => resolve())
  })
  move()
  await Promise.race([
    navigated,
    new Promise((resolve) => setTimeout(resolve, NATIVE_MOVE_TIMEOUT_MS)),
  ])
  stop()
  await settle(app)
}

/**
 * Clicks an in-app anchor to `path`, which kit's own link handler follows, and waits for
 * kit to commit the navigation.
 *
 * @param app - The started test app.
 * @param container - Where the anchor is added for the click.
 * @param path - The in-app path the anchor links to.
 */
export const clickLink = (app: KitApp, container: HTMLElement, path: string): Promise<void> =>
  awaitNavigation(app, () => {
    const anchor = document.createElement('a')
    anchor.href = app.resolve(path)
    container.appendChild(anchor)
    anchor.click()
    anchor.remove()
  })

/** A started kit app. */
export interface StartedKit {
  /** What the test app's root layout built. */
  app: KitApp
  /** Removes the listeners kit added. */
  stop(): void
}

/** Kit's client entry (`src/runtime/client/entry.js`), which `vite dev` serves to the page. */
const kitClientEntry = join(
  dirname(createRequire(import.meta.url).resolve('@sveltejs/kit/package.json')),
  'src/runtime/client/entry.js',
)

/**
 * jsdom has no layout, so no `IntersectionObserver`; kit uses one only to preload the
 * links scrolled into view (`setup_preload`, `src/runtime/client/client.js`). This one
 * never reports an intersection, as nothing in jsdom is ever on screen.
 */
class NoLayoutIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly scrollMargin = '0px'
  readonly thresholds: readonly number[] = [0]
  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve(): void {}
}

/**
 * jsdom implements no `SVGAElement` class, and kit's link handler tests
 * `element instanceof SVGAElement` (`find_anchor`, `src/runtime/client/utils.js`) on every
 * click. This one answers that test as a browser does: an `<a>` in the SVG namespace.
 */
const SVGAElementCheck = {
  [Symbol.hasInstance]: (value: unknown): boolean =>
    value instanceof SVGElement && value.localName === 'a',
}

/** A listener kit added: removed again by `stop`. */
type Added = [
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | EventListenerOptions,
]

/**
 * Starts kit at `url` (the document URL: base, path, and for hash routing the `#/…`
 * fragment), rendering the test app into `target`.
 *
 * @param url - The document URL to start at.
 * @param target - Where kit renders the app.
 * @returns The started app.
 */
export async function startKit(url: string, target: HTMLElement): Promise<StartedKit> {
  if (!('IntersectionObserver' in window)) {
    Object.assign(window, { IntersectionObserver: NoLayoutIntersectionObserver })
  }
  if (!('SVGAElement' in window)) Object.assign(window, { SVGAElement: SVGAElementCheck })
  window.history.replaceState(null, '', url)
  // Kit keeps scroll positions and snapshots per history entry in session storage.
  window.sessionStorage.clear()
  vi.resetModules()
  const added: Added[] = []
  const { pushState, replaceState } = window.history
  const original = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (this: EventTarget, type, listener, options) {
    added.push([this, type, listener, options])
    original.call(this, type, listener, options)
  }
  // Vitest's `window` is the global object, whose `addEventListener` vitest binds to the
  // jsdom window when it sets the environment up, so kit's bare `addEventListener(…)` (its
  // popstate and hashchange handlers) never reaches the prototype above.
  const windowAdd = window.addEventListener
  const recordWindowListener = (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    added.push([window, type, listener, options])
    windowAdd(type, listener, options)
  }
  window.addEventListener = recordWindowListener
  try {
    const { whenKitStarted } = await import('./kit-app/src/lib/started.js')
    const outDir = inject('kitOutDir')
    const app: unknown = await import(
      /* @vite-ignore */ join(outDir, 'generated/dev/client/app.js')
    )
    const kit: {
      init(payload: { base: string; version: string }): void
      start(app: unknown, target: HTMLElement): Promise<void>
    } = await import(/* @vite-ignore */ kitClientEntry)
    // What the page kit renders runs first: `kit.init({ base, version })`
    // (`src/runtime/server/page/render.js`), then `kit.start(app, target)`.
    kit.init({ base: kitBase, version: 'test' })
    await kit.start(app, target)
    const started = await whenKitStarted()
    return {
      app: started,
      stop: () => {
        for (const [eventTarget, type, listener, options] of added) {
          eventTarget.removeEventListener(type, listener, options)
        }
        window.history.pushState = pushState
        window.history.replaceState = replaceState
      },
    }
  } finally {
    EventTarget.prototype.addEventListener = original
    window.addEventListener = windowAdd
  }
}
