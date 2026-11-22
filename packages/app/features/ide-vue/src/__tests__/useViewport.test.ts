// @vitest-environment jsdom

/**
 * `useMediaQueryMatch` reads the browser's media-query state as reactive state,
 * so these tests pin the contract the IDE depends on — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/useViewport.test.tsx` with the same
 * test names and the same behavioral assertions:
 *
 * - the FIRST render already reports the query's real match (not `false` until
 *   an effect ran) — a phone-width first paint is not a desktop one;
 * - a media-query `change` event re-renders with the new match;
 * - changing the `query` argument reports the NEW query in that same render;
 * - with no `matchMedia` (SSR, an old environment) it reports `false` and never
 *   throws.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'
import { type App, createApp, defineComponent, h, nextTick, type Ref, ref } from 'vue'

import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'

import { useCoarsePointer, useMediaQueryMatch, useNarrowViewport } from '../hooks/useViewport.js'

/**
 * A `MediaQueryList` whose match and `change` listeners the test drives. The
 * match itself lives in the stub's map, so the same instance follows a `set()`.
 */
class StubMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media: string
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null
  private readonly readMatches: () => boolean
  private readonly changeListeners = new Set<EventListenerOrEventListenerObject>()

  /**
   * @param query - The media query string.
   * @param readMatches - Reads the query's current match.
   */
  constructor(query: string, readMatches: () => boolean) {
    super()
    this.media = query
    this.readMatches = readMatches
  }

  /** The query's current match. */
  get matches(): boolean {
    return this.readMatches()
  }

  /** How many `change` listeners are registered. */
  get listenerCount(): number {
    return this.changeListeners.size
  }

  /**
   * Registers a listener (the hooks' path).
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
    super.addEventListener(type, listener, options)
    if (type === 'change' && listener) this.changeListeners.add(listener)
  }

  /**
   * Removes a listener (the hooks' teardown path).
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
    super.removeEventListener(type, listener, options)
    if (type === 'change' && listener) this.changeListeners.delete(listener)
  }

  /**
   * Legacy listener registration (unused by the hooks, present for the type).
   * @param _callback - The listener.
   */
  addListener(_callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null): void {}

  /**
   * Legacy listener removal (unused by the hooks, present for the type).
   * @param _callback - The listener.
   */
  removeListener(
    _callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null,
  ): void {}

  /**
   * Fires the `change` event with the given match, as a browser does.
   *
   * @param matches - The new match state.
   */
  emit(matches: boolean): void {
    const event = new Event('change')
    Object.defineProperty(event, 'matches', { value: matches })
    for (const listener of this.changeListeners) {
      if (typeof listener === 'function') listener(event)
      else listener.handleEvent(event)
    }
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
 * Installs a controllable `window.matchMedia`. One stable list per query, so a
 * `set()` notifies the exact instance the hook subscribed to.
 *
 * @param initial - Initial match per query.
 * @returns The controls for flipping a query's match.
 */
function installMatchMedia(initial: Record<string, boolean>): MediaStub {
  const matches = new Map(Object.entries(initial))
  const lists = new Map<string, StubMediaQueryList>()
  const listFor = (query: string): StubMediaQueryList => {
    let list = lists.get(query)
    if (!list) {
      list = new StubMediaQueryList(query, () => matches.get(query) ?? false)
      lists.set(query, list)
    }
    return list
  }
  window.matchMedia = (query: string): MediaQueryList => listFor(query)
  return {
    set(query, value) {
      matches.set(query, value)
      listFor(query).emit(value)
    },
    listenerCount(query) {
      return lists.get(query)?.listenerCount ?? 0
    },
  }
}

const originalMatchMedia = window.matchMedia

/**
 * Replaces (or removes) `window.matchMedia` without inventing a second API.
 *
 * @param value - The replacement function, or undefined.
 */
function setMatchMedia(value: unknown): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value,
  })
}

/** The apps this file mounted, unmounted after every test. */
const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  setMatchMedia(originalMatchMedia)
})

/**
 * Mounts a component whose setup calls one hook, the way an app does.
 *
 * @param setup - The setup body.
 * @returns The mounted app.
 */
function mountSetup(setup: () => void): App {
  const app = createApp(defineComponent({ setup, render: () => h('div') }))
  apps.push(app)
  app.mount(document.createElement('div'))
  return app
}

describe('useMediaQueryMatch', () => {
  it('reports the query match on the first render', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true })
    let result: Ref<boolean> | undefined
    mountSetup(() => {
      result = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(result!.value).toBe(true)
  })

  it('re-renders with the new match when the media query changes', async () => {
    const media = installMatchMedia({ [NARROW_VIEWPORT_QUERY]: false })
    let result: Ref<boolean> | undefined
    mountSetup(() => {
      result = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(result!.value).toBe(false)

    media.set(NARROW_VIEWPORT_QUERY, true)
    await nextTick()
    expect(result!.value).toBe(true)

    media.set(NARROW_VIEWPORT_QUERY, false)
    await nextTick()
    expect(result!.value).toBe(false)
  })

  it('re-reads the match in the render that changes the query', async () => {
    const media = installMatchMedia({
      [NARROW_VIEWPORT_QUERY]: false,
      [COARSE_POINTER_QUERY]: true,
    })
    const query = ref(NARROW_VIEWPORT_QUERY)
    let result: Ref<boolean> | undefined
    mountSetup(() => {
      result = useMediaQueryMatch(query)
    })
    expect(result!.value).toBe(false)

    query.value = COARSE_POINTER_QUERY
    await nextTick()
    expect(result!.value).toBe(true)
    // The old query's subscription is gone; the new one is live.
    expect(media.listenerCount(NARROW_VIEWPORT_QUERY)).toBe(0)
    expect(media.listenerCount(COARSE_POINTER_QUERY)).toBe(1)
  })

  it('reports false without matchMedia instead of throwing', () => {
    setMatchMedia(undefined)
    let result: Ref<boolean> | undefined
    mountSetup(() => {
      result = useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
    })
    expect(result!.value).toBe(false)
  })
})

describe('viewport aliases', () => {
  it('build the phone and touch answers from their own queries', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true, [COARSE_POINTER_QUERY]: false })
    let narrow: Ref<boolean> | undefined
    let coarse: Ref<boolean> | undefined
    mountSetup(() => {
      narrow = useNarrowViewport()
      coarse = useCoarsePointer()
    })
    expect(narrow!.value).toBe(true)
    expect(coarse!.value).toBe(false)
  })
})
