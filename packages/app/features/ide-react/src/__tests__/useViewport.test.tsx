// @vitest-environment jsdom

/**
 * `useMediaQueryMatch` reads the browser's media-query state as an external
 * store, so these tests pin the contract the IDE depends on:
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

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'

import { useCoarsePointer, useMediaQueryMatch, useNarrowViewport } from '../hooks/useViewport.js'

type ChangeListener = (event: { matches: boolean }) => void

/** A matchMedia stub whose matches/change events the test drives. */
interface MediaStub {
  /** Set a query's match and fire its `change` listeners. */
  set(query: string, matches: boolean): void
  /** How many listeners a query currently has registered. */
  listenerCount(query: string): number
}

/**
 * Installs a controllable `window.matchMedia`.
 * @param initial - Initial match per query.
 * @returns The controls for flipping a query's match.
 */
function installMatchMedia(initial: Record<string, boolean>): MediaStub {
  const matches = new Map(Object.entries(initial))
  const listeners = new Map<string, Set<ChangeListener>>()
  window.matchMedia = ((query: string) => {
    const set = listeners.get(query) ?? new Set<ChangeListener>()
    listeners.set(query, set)
    return {
      get matches(): boolean {
        return matches.get(query) ?? false
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: ChangeListener) => set.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) => set.delete(listener),
      addListener: (listener: ChangeListener) => set.add(listener),
      removeListener: (listener: ChangeListener) => set.delete(listener),
      dispatchEvent: () => false,
    }
  }) as unknown as typeof window.matchMedia
  return {
    set(query, value) {
      matches.set(query, value)
      act(() => {
        for (const listener of listeners.get(query) ?? []) listener({ matches: value })
      })
    },
    listenerCount(query) {
      return listeners.get(query)?.size ?? 0
    },
  }
}

const originalMatchMedia = window.matchMedia

/** Replace (or remove) `window.matchMedia` without inventing a second API. */
function setMatchMedia(value: unknown): void {
  ;(window as unknown as { matchMedia: unknown }).matchMedia = value
}

afterEach(() => {
  cleanup()
  setMatchMedia(originalMatchMedia)
})

describe('useMediaQueryMatch', () => {
  it('reports the query match on the first render', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true })
    const { result } = renderHook(() => useMediaQueryMatch(NARROW_VIEWPORT_QUERY))
    expect(result.current).toBe(true)
  })

  it('re-renders with the new match when the media query changes', () => {
    const media = installMatchMedia({ [NARROW_VIEWPORT_QUERY]: false })
    const { result } = renderHook(() => useMediaQueryMatch(NARROW_VIEWPORT_QUERY))
    expect(result.current).toBe(false)

    media.set(NARROW_VIEWPORT_QUERY, true)
    expect(result.current).toBe(true)

    media.set(NARROW_VIEWPORT_QUERY, false)
    expect(result.current).toBe(false)
  })

  it('re-reads the match in the render that changes the query', () => {
    const media = installMatchMedia({
      [NARROW_VIEWPORT_QUERY]: false,
      [COARSE_POINTER_QUERY]: true,
    })
    const { result, rerender } = renderHook(({ query }) => useMediaQueryMatch(query), {
      initialProps: { query: NARROW_VIEWPORT_QUERY },
    })
    expect(result.current).toBe(false)

    rerender({ query: COARSE_POINTER_QUERY })
    expect(result.current).toBe(true)
    // The old query's subscription is gone; the new one is live.
    expect(media.listenerCount(NARROW_VIEWPORT_QUERY)).toBe(0)
    expect(media.listenerCount(COARSE_POINTER_QUERY)).toBe(1)
  })

  it('reports false without matchMedia instead of throwing', () => {
    setMatchMedia(undefined)
    const { result } = renderHook(() => useMediaQueryMatch(NARROW_VIEWPORT_QUERY))
    expect(result.current).toBe(false)
  })
})

describe('viewport aliases', () => {
  it('build the phone and touch answers from their own queries', () => {
    installMatchMedia({ [NARROW_VIEWPORT_QUERY]: true, [COARSE_POINTER_QUERY]: false })
    const narrow = renderHook(() => useNarrowViewport())
    const coarse = renderHook(() => useCoarsePointer())
    expect(narrow.result.current).toBe(true)
    expect(coarse.result.current).toBe(false)
  })
})
