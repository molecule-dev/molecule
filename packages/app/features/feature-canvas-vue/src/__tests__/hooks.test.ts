// @vitest-environment jsdom
/**
 * Unit tests for the Vue canvas composables — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/hooks.test.tsx`: the same
 * test names and behavioral assertions, with Vue's refs standing in for
 * React's state.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, nextTick, ref } from 'vue'

import { useCanvasSelection, useCanvasViewport } from '../hooks.js'
import type { CanvasViewport, UseCanvasSelectionResult } from '../types.js'

const apps: ReturnType<typeof createApp>[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

/**
 * Mounts a host component that calls one composable, and returns its result.
 *
 * @param use - The composable call.
 * @returns A reader for the composable's result.
 */
function mountHook<T>(use: () => T): () => T {
  let result: T
  const app = createApp(
    defineComponent({
      setup() {
        result = use()
        return () => null
      },
    }),
  )
  app.mount(document.createElement('div'))
  apps.push(app)
  return () => result
}

describe('useCanvasViewport', () => {
  it('seeds from initial', () => {
    const read = mountHook(() => useCanvasViewport({ initial: { x: 10, y: 20, zoom: 2 } }))
    expect(read().viewport.value).toEqual({ x: 10, y: 20, zoom: 2 })
  })

  it('panBy translates by screen-space delta divided by zoom', () => {
    const read = mountHook(() => useCanvasViewport({ initial: { x: 0, y: 0, zoom: 2 } }))
    read().panBy(100, 50)
    // With zoom 2, screen 100 = canvas 50; pan moves origin opposite direction.
    expect(read().viewport.value.x).toBe(-50)
    expect(read().viewport.value.y).toBe(-25)
    expect(read().viewport.value.zoom).toBe(2)
  })

  it('zoomBy holds the focal point fixed in canvas-space', () => {
    const read = mountHook(() => useCanvasViewport({ initial: { x: 0, y: 0, zoom: 1 } }))
    // Focal point at screen (50, 50) → canvas-space (50, 50).
    read().zoomBy(2, 50, 50)
    // After zoom: same screen point should still map to canvas (50, 50).
    const vp = read().viewport.value
    const canvasFocalX = 50 / vp.zoom + vp.x
    const canvasFocalY = 50 / vp.zoom + vp.y
    expect(canvasFocalX).toBeCloseTo(50, 6)
    expect(canvasFocalY).toBeCloseTo(50, 6)
    expect(vp.zoom).toBe(2)
  })

  it('clamps via limits', () => {
    const read = mountHook(() =>
      useCanvasViewport({
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      }),
    )
    read().zoomBy(10, 0, 0)
    expect(read().viewport.value.zoom).toBe(2)
  })

  it('reset returns to initial', () => {
    const read = mountHook(() => useCanvasViewport({ initial: { x: 5, y: 5, zoom: 1 } }))
    read().panBy(40, 40)
    expect(read().viewport.value.x).not.toBe(5)
    read().reset()
    expect(read().viewport.value).toEqual({ x: 5, y: 5, zoom: 1 })
  })

  it('controlled mode delegates to onChange', async () => {
    const calls: CanvasViewport[] = []
    const vp = ref<CanvasViewport>({ x: 0, y: 0, zoom: 1 })
    const read = mountHook(() =>
      useCanvasViewport(() => ({ value: vp.value, onChange: (next) => calls.push(next) })),
    )
    read().panBy(20, 0)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.x).toBeCloseTo(-20, 6)
    // Internal state should NOT change in controlled mode — the viewport
    // still reflects the controlled value.
    expect(read().viewport.value).toEqual({ x: 0, y: 0, zoom: 1 })
    // After the parent feeds the new value, the viewport reflects it.
    vp.value = calls[0]!
    await nextTick()
    expect(read().viewport.value).toEqual(calls[0])
  })
})

describe('useCanvasSelection', () => {
  it('starts empty by default', () => {
    const read = mountHook(() => useCanvasSelection())
    expect(read().selected.value.size).toBe(0)
  })

  it('seeds from initial', () => {
    const read = mountHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    expect(read().isSelected('a')).toBe(true)
    expect(read().isSelected('b')).toBe(true)
    expect(read().isSelected('c')).toBe(false)
  })

  it('select replaces by default', () => {
    const read = mountHook(() => useCanvasSelection({ initial: ['a'] }))
    read().select(['b'])
    expect(read().isSelected('a')).toBe(false)
    expect(read().isSelected('b')).toBe(true)
  })

  it('select with additive=true merges', () => {
    const read = mountHook(() => useCanvasSelection({ initial: ['a'] }))
    read().select(['b'], true)
    expect(read().isSelected('a')).toBe(true)
    expect(read().isSelected('b')).toBe(true)
  })

  it('toggle flips membership', () => {
    const read = mountHook(() => useCanvasSelection())
    read().toggle('a')
    expect(read().isSelected('a')).toBe(true)
    read().toggle('a')
    expect(read().isSelected('a')).toBe(false)
  })

  it('deselect removes when present, no-op otherwise', () => {
    const read = mountHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    read().deselect('a')
    expect(read().isSelected('a')).toBe(false)
    expect(read().isSelected('b')).toBe(true)
    // No throw on absent id.
    read().deselect('z')
    expect(read().isSelected('b')).toBe(true)
  })

  it('clear empties the set', () => {
    const read = mountHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    read().clear()
    expect(read().selected.value.size).toBe(0)
  })

  it('controlled mode delegates to onChange', () => {
    const calls: ReadonlySet<string>[] = []
    const read: () => UseCanvasSelectionResult = mountHook(() =>
      useCanvasSelection({
        value: new Set<string>(['a']),
        onChange: (next) => calls.push(next),
      }),
    )
    read().toggle('b')
    expect(calls).toHaveLength(1)
    expect(calls[0]!.has('a')).toBe(true)
    expect(calls[0]!.has('b')).toBe(true)
  })
})
