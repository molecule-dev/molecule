// @vitest-environment jsdom

/**
 * `useMediaQueryMatch` reads the browser's media-query state as a signal, so
 * these tests pin the contract the IDE depends on — the Solid counterpart of
 * `@molecule/app-ide-react/src/__tests__/useViewport.test.tsx`, with the same
 * test names and the same assertions:
 *
 * - the FIRST render already reports the query's real match (not `false` until
 *   an effect ran) — a phone-width first paint is not a desktop one;
 * - a media-query `change` event re-reads with the new match;
 * - changing the `query` accessor reports the NEW query at once;
 * - with no `matchMedia` (SSR, an old environment) it reports `false` and never
 *   throws.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'

import { useCoarsePointer, useMediaQueryMatch, useNarrowViewport } from '../hooks/useViewport.js'

/** A media-query `change` listener, as the hooks register it. */
type ChangeListener = (event: MediaQueryListEvent) => void

/** A matchMedia stub whose matches/change events the test drives. */
interface MediaStub {
  /** Set a query's match and fire its `change` listeners. */
  set(query: string, matches: boolean): void
  /** How many listeners a query currently has registered. */
  listenerCount(query: string): number
}

/**
 * A `MediaQueryList` whose match state and listeners the stub controls: a real
 * `EventTarget` with the two `change`-listener methods intercepted so the
 * registry sees every registration the hook makes.
 */
class StubMediaQueryList extends EventTarget {
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null
  /** The query this list reports on. */
  readonly media: string
  /** Reads the query's current match state. */
  readonly matchOf: () => boolean
  /** The `change` listeners registered against this list. */
  readonly changeListeners: Set<ChangeListener>

  /**
   * @param media - The query string.
   * @param matchOf - Reads the query's current match state.
   * @param changeListeners - The registry this list's listeners join.
   */
  constructor(media: string, matchOf: () => boolean, changeListeners: Set<ChangeListener>) {
    super()
    this.media = media
    this.matchOf = matchOf
    this.changeListeners = changeListeners
  }

  /** Whether the query currently matches. */
  get matches(): boolean {
    return this.matchOf()
  }

  /**
   * Registers a `change` listener (the modern API the hook uses).
   *
   * @param type - The event type.
   * @param listener - The listener.
   * @param options - Listener options.
   */
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type === 'change' && typeof listener === 'function') {
      this.changeListeners.add(listener as ChangeListener)
    }
    super.addEventListener(type, listener, options)
  }

  /**
   * Removes a `change` listener (the modern API the hook uses).
   *
   * @param type - The event type.
   * @param listener - The listener.
   * @param options - Listener options.
   */
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    if (type === 'change' && typeof listener === 'function') {
      this.changeListeners.delete(listener as ChangeListener)
    }
    super.removeEventListener(type, listener, options)
  }

  /**
   * Registers a `change` listener (the deprecated API React's stub also has).
   *
   * @param callback - The listener.
   */
  addListener(callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null): void {
    if (callback) this.changeListeners.add(callback as ChangeListener)
  }

  /**
   * Removes a `change` listener (the deprecated API).
   *
   * @param callback - The listener.
   */
  removeListener(
    callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
  ): void {
    if (callback) this.changeListeners.delete(callback as ChangeListener)
  }
}

/**
 * Installs a controllable `window.matchMedia`.
 *
 * @param initial - Initial match per query.
 * @returns The controls for flipping a query's match.
 */
function installMatchMedia(initial: Record<string, boolean>): MediaStub {
  const matches = new Map(Object.entries(initial))
  const listeners = new Map<string, Set<ChangeListener>>()
  const matchMedia = (query: string): MediaQueryList => {
    const set = listeners.get(query) ?? new Set<ChangeListener>()
    listeners.set(query, set)
    return new StubMediaQueryList(query, () => matches.get(query) ?? false, set)
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })
  return {
    set(query, value) {
      matches.set(query, value)
      for (const listener of listeners.get(query) ?? []) {
        listener({ matches: value } as MediaQueryListEvent)
      }
    },
    listenerCount(query) {
      return listeners.get(query)?.size ?? 0
    },
  }
}

const originalMatchMedia = window.matchMedia

/**
 * Replace (or remove) `window.matchMedia` without inventing a second API.
 *
 * @param value - The replacement (or `undefined` to remove it).
 */
function setMatchMedia(value: unknown): void {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value })
}

/** The roots this file mounted; disposed after every test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  setMatchMedia(originalMatchMedia)
})

/**
 * Mounts a component whose body calls one hook, the way an app does.
 *
 * @param setup - The component body.
 */
function mountProbe(setup: () => void): void {
  function Probe(): JSX.Element {
    setup()
    return <></>
  }
  const container = document.createElement('div')
  disposers.push(render(() => <Probe />, container))
}

describe('useMediaQueryMatch', () => {
  it('reports the query match on the first render', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true })
    let match: Accessor<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(match!()).toBe(true)
  })

  it('re-renders with the new match when the media query changes', () => {
    const media = installMatchMedia({ [NARROW_VIEWPORT_QUERY]: false })
    let match: Accessor<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(match!()).toBe(false)

    media.set(NARROW_VIEWPORT_QUERY, true)
    expect(match!()).toBe(true)

    media.set(NARROW_VIEWPORT_QUERY, false)
    expect(match!()).toBe(false)
  })

  it('re-reads the match in the render that changes the query', () => {
    const media = installMatchMedia({
      [NARROW_VIEWPORT_QUERY]: false,
      [COARSE_POINTER_QUERY]: true,
    })
    const [query, setQuery] = createSignal<string>(NARROW_VIEWPORT_QUERY)
    let match: Accessor<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(query)
    })
    expect(match!()).toBe(false)

    setQuery(COARSE_POINTER_QUERY)
    expect(match!()).toBe(true)
    // The old query's subscription is gone; the new one is live.
    expect(media.listenerCount(NARROW_VIEWPORT_QUERY)).toBe(0)
    expect(media.listenerCount(COARSE_POINTER_QUERY)).toBe(1)
  })

  it('reports false without matchMedia instead of throwing', () => {
    setMatchMedia(undefined)
    let match: Accessor<boolean> | undefined
    mountProbe(() => {
      match = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(match!()).toBe(false)
  })
})

describe('viewport aliases', () => {
  it('build the phone and touch answers from their own queries', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true, [COARSE_POINTER_QUERY]: false })
    let narrow: Accessor<boolean> | undefined
    let coarse: Accessor<boolean> | undefined
    mountProbe(() => {
      narrow = useNarrowViewport()
    })
    mountProbe(() => {
      coarse = useCoarsePointer()
    })
    expect(narrow!()).toBe(true)
    expect(coarse!()).toBe(false)
  })
})
