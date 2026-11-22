// @vitest-environment jsdom

/**
 * `useMediaQueryMatch` reads the browser's media-query state as reactive state,
 * so these tests pin the contract the IDE depends on — the Angular port of
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
 * The hooks are called in a real zoneless Angular application's injection
 * context (a host component's field initializer), the way an app calls them.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

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
   * Registers a listener (the hook's path).
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
   * Removes a listener (the hook's teardown path).
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
   * Legacy listener registration (unused by the hook, present for the type).
   * @param _callback - The listener.
   */
  addListener(_callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null): void {}

  /**
   * Legacy listener removal (unused by the hook, present for the type).
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

/** A mounted hook host, with the machinery to flush a pending effect. */
interface Mounted {
  /** The applied application (destroyed after every test). */
  appRef: ApplicationRef
  /** The host component instance. */
  ref: ComponentRef<unknown>
  /** Tears the host down and removes it from the document. */
  destroy: () => Promise<void>
  /** Flushes pending effects and change detection. */
  flush: () => Promise<void>
}

/** The mounts this file created; destroyed after every test. */
const mounts: Mounted[] = []

/** Host selectors minted so far (each mount defines its own component). */
let hostCount = 0

afterEach(async () => {
  for (const mount of mounts.splice(0)) await mount.destroy()
  setMatchMedia(originalMatchMedia)
})

/**
 * Mounts a host component whose field initializers call the hooks, then
 * settles the first change-detection pass.
 *
 * @param fields - The host's field initializers (the hook calls).
 * @returns The mount, holding the host instance.
 */
async function mountHost<T>(fields: () => T): Promise<Mounted & { fields: T }> {
  const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const Host = Component({
    selector: `mol-viewport-host-${++hostCount}`,
    standalone: true,
    template: '',
  })(
    class ViewportHost {
      // A field initializer runs in the component's injection context.
      readonly fields = fields()
    },
  )
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement)
  appRef.attachView(ref.hostView)
  /** Flushes pending effects and change detection. */
  const flush = async (): Promise<void> => {
    appRef.tick()
    for (let i = 0; i < 3; i++) await Promise.resolve()
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    appRef.tick()
  }
  const mount: Mounted & { fields: T } = {
    appRef,
    ref,
    fields: ref.instance.fields,
    flush,
    destroy: async () => {
      appRef.destroy()
      ref.location.nativeElement.remove()
    },
  }
  mounts.push(mount)
  await flush()
  return mount
}

describe('useMediaQueryMatch', () => {
  it('reports the query match on the first render', async () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true })
    const mount = await mountHost(() => useMediaQueryMatch(NARROW_VIEWPORT_QUERY))
    expect(mount.fields()).toBe(true)
  })

  it('re-renders with the new match when the media query changes', async () => {
    const media = installMatchMedia({ [NARROW_VIEWPORT_QUERY]: false })
    const mount = await mountHost(() => useMediaQueryMatch(NARROW_VIEWPORT_QUERY))
    expect(mount.fields()).toBe(false)

    media.set(NARROW_VIEWPORT_QUERY, true)
    await mount.flush()
    expect(mount.fields()).toBe(true)

    media.set(NARROW_VIEWPORT_QUERY, false)
    await mount.flush()
    expect(mount.fields()).toBe(false)
  })

  it('re-reads the match in the render that changes the query', async () => {
    const media = installMatchMedia({
      [NARROW_VIEWPORT_QUERY]: false,
      [COARSE_POINTER_QUERY]: true,
    })
    const query = signal(NARROW_VIEWPORT_QUERY)
    const mount = await mountHost(() => useMediaQueryMatch(query))
    expect(mount.fields()).toBe(false)

    query.set(COARSE_POINTER_QUERY)
    await mount.flush()
    expect(mount.fields()).toBe(true)
    // The old query's subscription is gone; the new one is live.
    expect(media.listenerCount(NARROW_VIEWPORT_QUERY)).toBe(0)
    expect(media.listenerCount(COARSE_POINTER_QUERY)).toBe(1)
  })

  it('reports false without matchMedia instead of throwing', async () => {
    setMatchMedia(undefined)
    const mount = await mountHost(() => useMediaQueryMatch(NARROW_VIEWPORT_QUERY))
    expect(mount.fields()).toBe(false)
  })
})

describe('viewport aliases', () => {
  it('build the phone and touch answers from their own queries', async () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true, [COARSE_POINTER_QUERY]: false })
    const mount = await mountHost(() => ({
      narrow: useNarrowViewport(),
      coarse: useCoarsePointer(),
    }))
    expect(mount.fields.narrow()).toBe(true)
    expect(mount.fields.coarse()).toBe(false)
  })
})
