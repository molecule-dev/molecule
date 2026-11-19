/**
 * The Svelte form of a page whose code loads on demand: a memoized store saying whether a
 * page's code has arrived, held on `window` because `startKit` resets the module registry
 * between started apps (a test resolves a page after the app that renders it has started).
 * The page itself is imported by the page module, as a route's component is; the store is
 * what the boundary reads, the counterpart of React's lazy-module promise.
 *
 * @module
 */

import { type Readable, type Writable, writable } from 'svelte/store'

/** One page's loaded state. */
interface LazyEntry {
  /** Whether the page code has arrived. */
  store: Writable<boolean>
}

declare global {
  interface Window {
    /** Loaded state by page name. */
    __moleculeLazyPages?: Map<string, LazyEntry>
    /** How many fallbacks committed (React's `fallbackRenders`). */
    __moleculeLazyFallbacks?: number
    /** The deferred the slow route's `load` waits on. */
    __moleculeSlowLoad?: { promise: Promise<void>; resolve: () => void }
  }
}

/** The shared map of loaded pages. */
const entries = (): Map<string, LazyEntry> => {
  window.__moleculeLazyPages ??= new Map()
  return window.__moleculeLazyPages
}

/**
 * One page entry, created on first use.
 *
 * @param key - The page's name.
 * @returns Its loaded state.
 */
const entryFor = (key: string): LazyEntry => {
  let entry = entries().get(key)
  if (!entry) {
    entry = { store: writable(false) }
    entries().set(key, entry)
  }
  return entry
}

/**
 * Forgets every loaded page and fallback count, for a fresh started app.
 */
export const resetLazyPages = (): void => {
  window.__moleculeLazyPages = new Map()
  window.__moleculeLazyFallbacks = 0
}

/**
 * One page's arrived state, created on first use.
 *
 * @param key - The page's name.
 * @returns A store that is `false` until the page's code arrives.
 */
export const pageArrived = (key: string): Readable<boolean> => {
  const { store } = entryFor(key)
  return { subscribe: store.subscribe }
}

/**
 * Lets a page's code arrive, as a dynamic import resolving does.
 *
 * @param key - The page's name.
 */
export const arrivePage = (key: string): void => {
  entryFor(key).store.set(true)
}

/** Counts one committed fallback (React's `fallbackRenders`). */
export const countFallbackRender = (): void => {
  window.__moleculeLazyFallbacks = (window.__moleculeLazyFallbacks ?? 0) + 1
}

/**
 * How many fallbacks committed so far.
 *
 * @returns The count.
 */
export const fallbackRenders = (): number => window.__moleculeLazyFallbacks ?? 0

/** Creates the deferred the slow route's load waits on, replacing any earlier one. */
export const armSlowLoad = (): void => {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  window.__moleculeSlowLoad = { promise, resolve }
}

/** Waits for the slow route's load to be released. */
export const slowLoad = async (): Promise<void> => {
  await window.__moleculeSlowLoad?.promise
}

/** Releases the slow route's load. */
export const releaseSlowLoad = (): void => {
  window.__moleculeSlowLoad?.resolve()
}
