// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCanvasSelection, useCanvasViewport } from '../hooks.js'

describe('useCanvasViewport', () => {
  it('seeds from initial', () => {
    const { result } = renderHook(() => useCanvasViewport({ initial: { x: 10, y: 20, zoom: 2 } }))
    expect(result.current.viewport).toEqual({ x: 10, y: 20, zoom: 2 })
  })

  it('panBy translates by screen-space delta divided by zoom', () => {
    const { result } = renderHook(() => useCanvasViewport({ initial: { x: 0, y: 0, zoom: 2 } }))
    act(() => {
      result.current.panBy(100, 50)
    })
    // With zoom 2, screen 100 = canvas 50; pan moves origin opposite direction.
    expect(result.current.viewport.x).toBe(-50)
    expect(result.current.viewport.y).toBe(-25)
    expect(result.current.viewport.zoom).toBe(2)
  })

  it('zoomBy holds the focal point fixed in canvas-space', () => {
    const { result } = renderHook(() => useCanvasViewport({ initial: { x: 0, y: 0, zoom: 1 } }))
    act(() => {
      // Focal point at screen (50, 50) → canvas-space (50, 50).
      result.current.zoomBy(2, 50, 50)
    })
    // After zoom: same screen point should still map to canvas (50, 50).
    const vp = result.current.viewport
    const canvasFocalX = 50 / vp.zoom + vp.x
    const canvasFocalY = 50 / vp.zoom + vp.y
    expect(canvasFocalX).toBeCloseTo(50, 6)
    expect(canvasFocalY).toBeCloseTo(50, 6)
    expect(vp.zoom).toBe(2)
  })

  it('clamps via limits', () => {
    const { result } = renderHook(() =>
      useCanvasViewport({
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      }),
    )
    act(() => {
      result.current.zoomBy(10, 0, 0)
    })
    expect(result.current.viewport.zoom).toBe(2)
  })

  it('reset returns to initial', () => {
    const { result } = renderHook(() => useCanvasViewport({ initial: { x: 5, y: 5, zoom: 1 } }))
    act(() => {
      result.current.panBy(40, 40)
    })
    expect(result.current.viewport.x).not.toBe(5)
    act(() => {
      result.current.reset()
    })
    expect(result.current.viewport).toEqual({ x: 5, y: 5, zoom: 1 })
  })

  it('controlled mode delegates to onChange', () => {
    const calls: Array<{ x: number; y: number; zoom: number }> = []
    const { result, rerender } = renderHook(
      ({ vp }: { vp: { x: number; y: number; zoom: number } }) =>
        useCanvasViewport({
          value: vp,
          onChange: (next) => calls.push(next),
        }),
      { initialProps: { vp: { x: 0, y: 0, zoom: 1 } } },
    )
    act(() => {
      result.current.panBy(20, 0)
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].x).toBeCloseTo(-20, 6)
    // Internal state should NOT change in controlled mode — viewport
    // still reflects the controlled value.
    expect(result.current.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
    // After parent feeds the new value, viewport reflects it.
    rerender({ vp: calls[0] })
    expect(result.current.viewport).toEqual(calls[0])
  })
})

describe('useCanvasSelection', () => {
  it('starts empty by default', () => {
    const { result } = renderHook(() => useCanvasSelection())
    expect(result.current.selected.size).toBe(0)
  })

  it('seeds from initial', () => {
    const { result } = renderHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.isSelected('b')).toBe(true)
    expect(result.current.isSelected('c')).toBe(false)
  })

  it('select replaces by default', () => {
    const { result } = renderHook(() => useCanvasSelection({ initial: ['a'] }))
    act(() => result.current.select(['b']))
    expect(result.current.isSelected('a')).toBe(false)
    expect(result.current.isSelected('b')).toBe(true)
  })

  it('select with additive=true merges', () => {
    const { result } = renderHook(() => useCanvasSelection({ initial: ['a'] }))
    act(() => result.current.select(['b'], true))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.isSelected('b')).toBe(true)
  })

  it('toggle flips membership', () => {
    const { result } = renderHook(() => useCanvasSelection())
    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(true)
    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(false)
  })

  it('deselect removes when present, no-op otherwise', () => {
    const { result } = renderHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    act(() => result.current.deselect('a'))
    expect(result.current.isSelected('a')).toBe(false)
    expect(result.current.isSelected('b')).toBe(true)
    // No throw on absent id.
    act(() => result.current.deselect('z'))
    expect(result.current.isSelected('b')).toBe(true)
  })

  it('clear empties the set', () => {
    const { result } = renderHook(() => useCanvasSelection({ initial: ['a', 'b'] }))
    act(() => result.current.clear())
    expect(result.current.selected.size).toBe(0)
  })

  it('controlled mode delegates to onChange', () => {
    const calls: Array<ReadonlySet<string>> = []
    const { result } = renderHook(() =>
      useCanvasSelection({
        value: new Set<string>(['a']),
        onChange: (next) => calls.push(next),
      }),
    )
    act(() => result.current.toggle('b'))
    expect(calls).toHaveLength(1)
    expect(calls[0].has('a')).toBe(true)
    expect(calls[0].has('b')).toBe(true)
  })
})
