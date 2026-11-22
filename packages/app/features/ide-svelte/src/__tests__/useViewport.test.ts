// @vitest-environment jsdom

/**
 * `useMediaQueryMatch` reads the browser's media-query state as a Svelte
 * readable store, so these tests pin the contract the IDE depends on — a port
 * of `@molecule/app-ide-react/src/__tests__/useViewport.test.tsx` with the same
 * test names and the same behavioral assertions:
 *
 * - the FIRST mount already reports the query's real match (not `false` until
 *   an effect ran) — a phone-width first paint is not a desktop one;
 * - a media-query `change` event updates the store with the new match;
 * - changing the `query` argument (a store) reports the NEW query at once and
 *   follows it instead of the old one on the same mount;
 * - with no `matchMedia` (SSR, an old environment) it reports `false` and never
 *   throws.
 *
 * The framework forces the translation: React's hook returns a value and
 * re-renders, Svelte's returns a readable store mounted during component init,
 * so each test mounts a probe that calls the hook and reads the store.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'

import { useCoarsePointer, useMediaQueryMatch, useNarrowViewport } from '../hooks/useViewport.js'
import HookProbe from './HookProbe.svelte'

/**
 * A real `change` event that also carries the media query's `matches` flag.
 *
 * jsdom has no `MediaQueryListEvent` constructor, so this is the smallest event
 * that satisfies its interface: `Event` plus `matches`/`media`.
 */
class MediaQueryMatchEvent extends Event implements MediaQueryListEvent {
  /** Whether the query matches after the change. */
  readonly matches: boolean
  /** The query that changed. */
  readonly media: string

  /**
   * @param media - The query that changed.
   * @param matches - Its new match state.
   */
  constructor(media: string, matches: boolean) {
    super('change')
    this.media = media
    this.matches = matches
  }
}

/** A matchMedia stub whose matches/change events the test drives. */
interface MediaStub {
  /** Set a query's match and fire its `change` listeners. */
  set(query: string, matches: boolean): void
  /** How many listeners a query currently has registered. */
  listenerCount(query: string): number
}

/**
 * Builds one `MediaQueryList` backed by the shared per-query state.
 *
 * @param query - The query this list answers for.
 * @param matches - The current match map.
 * @param listeners - The registered listeners, per query.
 * @returns A {@link MediaQueryList} the test can drive.
 */
function buildMediaQueryList(
  query: string,
  matches: Map<string, boolean>,
  listeners: Map<string, Set<(event: MediaQueryListEvent) => void>>,
): MediaQueryList {
  const set = listeners.get(query) ?? new Set<(event: MediaQueryListEvent) => void>()
  listeners.set(query, set)
  // The wrapper each registered listener was stored as, so removal takes back
  // exactly the entry the matching `add` put in.
  const wrappers = new Map<
    EventListenerOrEventListenerObject,
    (event: MediaQueryListEvent) => void
  >()
  const wrap = (
    listener: EventListenerOrEventListenerObject,
  ): ((event: MediaQueryListEvent) => void) =>
    typeof listener === 'function'
      ? (event) => listener(event)
      : (event) => listener.handleEvent(event)
  return {
    get matches(): boolean {
      return matches.get(query) ?? false
    },
    media: query,
    onchange: null,
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject | null): void => {
      if (type !== 'change' || !listener) return
      const wrapped = wrap(listener)
      wrappers.set(listener, wrapped)
      set.add(wrapped)
    },
    removeEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
    ): void => {
      if (type !== 'change' || !listener) return
      const wrapped = wrappers.get(listener)
      if (wrapped) {
        set.delete(wrapped)
        wrappers.delete(listener)
      }
    },
    addListener: (callback): void => {
      if (callback) set.add(callback)
    },
    removeListener: (callback): void => {
      if (callback) set.delete(callback)
    },
    dispatchEvent: (): boolean => false,
  }
}

/**
 * Installs a controllable `window.matchMedia`.
 * @param initial - Initial match per query.
 * @returns The controls for flipping a query's match.
 */
function installMatchMedia(initial: Record<string, boolean>): MediaStub {
  const matches = new Map(Object.entries(initial))
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>()
  window.matchMedia = (query: string): MediaQueryList =>
    buildMediaQueryList(query, matches, listeners)
  return {
    set(query, value) {
      matches.set(query, value)
      const event = new MediaQueryMatchEvent(query, value)
      for (const listener of listeners.get(query) ?? []) listener(event)
    },
    listenerCount(query) {
      return listeners.get(query)?.size ?? 0
    },
  }
}

const originalMatchMedia = window.matchMedia

/** The mounted probes; torn down after every test, like React's roots. */
const instances: Record<string, unknown>[] = []

/**
 * A wrapper over {@link MediaQueryList} that can be removed from `window` the
 * way React's test removes `matchMedia` entirely.
 *
 * @param value - The replacement (or `undefined` to remove it).
 */
function setMatchMedia(value: MediaQueryList | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(window, 'matchMedia')
    return
  }
  window.matchMedia = (): MediaQueryList => value
}

/**
 * Mounts a component whose init calls one hook, the way an app does.
 *
 * @param call - The init body.
 */
function mountProbe(call: () => void): void {
  const instance: Record<string, unknown> = mount(HookProbe, {
    target: document.createElement('div'),
    props: { call },
  })
  instances.push(instance)
  flushSync()
}

afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  window.matchMedia = originalMatchMedia
})

describe('useMediaQueryMatch', () => {
  it('reports the query match on the first render', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true })
    let match: Readable<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(get(match!)).toBe(true)
  })

  it('re-renders with the new match when the media query changes', () => {
    const media = installMatchMedia({ [NARROW_VIEWPORT_QUERY]: false })
    let match: Readable<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(get(match!)).toBe(false)

    media.set(NARROW_VIEWPORT_QUERY, true)
    flushSync()
    expect(get(match!)).toBe(true)

    media.set(NARROW_VIEWPORT_QUERY, false)
    flushSync()
    expect(get(match!)).toBe(false)
  })

  it('re-reads the match in the render that changes the query', () => {
    const media = installMatchMedia({
      [NARROW_VIEWPORT_QUERY]: false,
      [COARSE_POINTER_QUERY]: true,
    })
    const query = writable<string>(NARROW_VIEWPORT_QUERY)
    let match: Readable<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(query)
    })
    expect(get(match!)).toBe(false)

    query.set(COARSE_POINTER_QUERY)
    flushSync()
    expect(get(match!)).toBe(true)
    // The old query's subscription is gone; the new one is live.
    expect(media.listenerCount(NARROW_VIEWPORT_QUERY)).toBe(0)
    expect(media.listenerCount(COARSE_POINTER_QUERY)).toBe(1)
  })

  it('reports false without matchMedia instead of throwing', () => {
    setMatchMedia(undefined)
    let match: Readable<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(get(match!)).toBe(false)
  })
})

describe('viewport aliases', () => {
  it('build the phone and touch answers from their own queries', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true, [COARSE_POINTER_QUERY]: false })
    let narrow: Readable<boolean> | undefined
    let coarse: Readable<boolean> | undefined
    mountProbe(() => {
      narrow = useNarrowViewport()
    })
    mountProbe(() => {
      coarse = useCoarsePointer()
    })
    expect(get(narrow!)).toBe(true)
    expect(get(coarse!)).toBe(false)
  })
})
