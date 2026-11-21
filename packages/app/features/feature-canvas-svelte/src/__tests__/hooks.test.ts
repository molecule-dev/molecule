// @vitest-environment jsdom
/**
 * Unit tests for the Svelte canvas hooks — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/hooks.test.tsx`: the same
 * test names and behavioral assertions, with Svelte stores standing in for
 * React's state.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'
import { afterEach, describe, expect, it } from 'vitest'

import { useCanvasSelection, useCanvasViewport } from '../hooks.js'
import type { CanvasViewport, UseCanvasSelectionResult, ViewportLimits } from '../types.js'
import Probe from './helpers/Probe.svelte'

const instances: Array<{ unmount: () => Promise<void> }> = []
const containers: HTMLElement[] = []

afterEach(async () => {
  for (const instance of instances.splice(0)) await instance.unmount()
  for (const container of containers.splice(0)) container.remove()
  document.body.innerHTML = ''
})

/**
 * Mounts a hook call in a real component and tracks its latest result.
 *
 * @param call - The hook call.
 * @returns A reader for the latest result.
 */
function renderHook<R>(call: () => Readable<R>): () => R {
  let latest!: R
  const container = document.createElement('div')
  containers.push(container)
  document.body.append(container)
  const instance = mount(Probe, {
    target: container,
    props: {
      call: call as () => Readable<unknown>,
      capture: (value: unknown) => {
        latest = value as R
      },
    },
  })
  flushSync()
  instances.push({ unmount: () => unmount(instance) })
  return () => latest
}

describe('useCanvasViewport', () => {
  it('seeds from initial', () => {
    const read = renderHook(() => useCanvasViewport({ initial: { x: 10, y: 20, zoom: 2 } }))
    expect(read().viewport).toEqual({ x: 10, y: 20, zoom: 2 })
  })

  it('panBy translates by screen-space delta divided by zoom', () => {
    const read = renderHook(() => useCanvasViewport({ initial: { x: 0, y: 0, zoom: 2 } }))
    read().panBy(100, 50)
    flushSync()
    // With zoom 2, screen 100 = canvas 50; pan moves origin opposite direction.
    expect(read().viewport.x).toBe(-50)
    expect(read().viewport.y).toBe(-25)
    expect(read().viewport.zoom).toBe(2)
  })

  it('zoomBy holds the focal point fixed in canvas-space', () => {
    const read = renderHook(() => useCanvasViewport({ initial: { x: 0, y: 0, zoom: 1 } }))
    // Focal point at screen (50, 50) → canvas-space (50, 50).
    read().zoomBy(2, 50, 50)
    flushSync()
    // After zoom: same screen point should still map to canvas (50, 50).
    const vp = read().viewport
    const canvasFocalX = 50 / vp.zoom + vp.x
    const canvasFocalY = 50 / vp.zoom + vp.y
    expect(canvasFocalX).toBeCloseTo(50, 6)
    expect(canvasFocalY).toBeCloseTo(50, 6)
    expect(vp.zoom).toBe(2)
  })

  it('clamps via limits', () => {
    const read = renderHook(() =>
      useCanvasViewport({
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      }),
    )
    read().zoomBy(10, 0, 0)
    flushSync()
    expect(read().viewport.zoom).toBe(2)
  })

  it('reset returns to initial', () => {
    const read = renderHook(() => useCanvasViewport({ initial: { x: 5, y: 5, zoom: 1 } }))
    read().panBy(40, 40)
    flushSync()
    expect(read().viewport.x).not.toBe(5)
    read().reset()
    flushSync()
    expect(read().viewport).toEqual({ x: 5, y: 5, zoom: 1 })
  })

  it('controlled mode delegates to onChange', () => {
    const calls: CanvasViewport[] = []
    const options: Writable<
      | {
          initial?: CanvasViewport
          limits?: ViewportLimits
          value?: CanvasViewport
          onChange?: (next: CanvasViewport) => void
        }
      | undefined
    > = writable({
      value: { x: 0, y: 0, zoom: 1 },
      onChange: (next: CanvasViewport) => calls.push(next),
    })
    const read = renderHook(() => useCanvasViewport(options))
    read().panBy(20, 0)
    flushSync()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.x).toBeCloseTo(-20, 6)
    // Internal state should NOT change in controlled mode — the viewport
    // still reflects the controlled value.
    expect(read().viewport).toEqual({ x: 0, y: 0, zoom: 1 })
    // After the parent feeds the new value, the viewport reflects it.
    options.set({ value: calls[0], onChange: (next: CanvasViewport) => calls.push(next) })
    flushSync()
    expect(read().viewport).toEqual(calls[0])
  })
})

describe('useCanvasSelection', () => {
  it('starts empty by default', () => {
    const read = renderHook(() => useCanvasSelection())
    expect(read().selected.size).toBe(0)
  })

  it('seeds from initial', () => {
    const read = renderHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    expect(read().isSelected('a')).toBe(true)
    expect(read().isSelected('b')).toBe(true)
    expect(read().isSelected('c')).toBe(false)
  })

  it('select replaces by default', () => {
    const read = renderHook(() => useCanvasSelection({ initial: ['a'] }))
    read().select(['b'])
    flushSync()
    expect(read().isSelected('a')).toBe(false)
    expect(read().isSelected('b')).toBe(true)
  })

  it('select with additive=true merges', () => {
    const read = renderHook(() => useCanvasSelection({ initial: ['a'] }))
    read().select(['b'], true)
    flushSync()
    expect(read().isSelected('a')).toBe(true)
    expect(read().isSelected('b')).toBe(true)
  })

  it('toggle flips membership', () => {
    const read = renderHook(() => useCanvasSelection())
    read().toggle('a')
    flushSync()
    expect(read().isSelected('a')).toBe(true)
    read().toggle('a')
    flushSync()
    expect(read().isSelected('a')).toBe(false)
  })

  it('deselect removes when present, no-op otherwise', () => {
    const read = renderHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    read().deselect('a')
    flushSync()
    expect(read().isSelected('a')).toBe(false)
    expect(read().isSelected('b')).toBe(true)
    // No throw on absent id.
    read().deselect('z')
    flushSync()
    expect(read().isSelected('b')).toBe(true)
  })

  it('clear empties the set', () => {
    const read = renderHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    read().clear()
    flushSync()
    expect(read().selected.size).toBe(0)
  })

  it('controlled mode delegates to onChange', () => {
    const calls: ReadonlySet<string>[] = []
    const read: () => UseCanvasSelectionResult = renderHook(() =>
      useCanvasSelection({
        value: new Set<string>(['a']),
        onChange: (next) => calls.push(next),
      }),
    )
    read().toggle('b')
    flushSync()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.has('a')).toBe(true)
    expect(calls[0]!.has('b')).toBe(true)
  })
})
