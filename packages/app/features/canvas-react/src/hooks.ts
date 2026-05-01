/**
 * Internal-state hooks for the canvas: viewport (camera) and selection
 * set management. Both hooks support a "controlled" mode via optional
 * external state and an "uncontrolled" mode that owns its own state.
 *
 * @module
 */

import { useCallback, useRef, useState } from 'react'

import { clampViewport } from './coordinates.js'
import type { CanvasItemId, CanvasViewport, ViewportLimits } from './types.js'

/** Result of {@link useCanvasViewport}. */
export interface UseCanvasViewportResult {
  /** Current viewport. */
  viewport: CanvasViewport
  /** Replace the viewport (clamped to `limits` if supplied). */
  setViewport: (next: CanvasViewport) => void
  /** Pan by a screen-space delta in pixels (interpreted via the current zoom). */
  panBy: (deltaX: number, deltaY: number) => void
  /**
   * Zoom around a screen-space focal point. `factor > 1` zooms in,
   * `< 1` zooms out. The focal point's canvas-space position is held
   * fixed across the zoom.
   */
  zoomBy: (factor: number, focalScreenX: number, focalScreenY: number) => void
  /** Reset to the initial viewport. */
  reset: () => void
}

/**
 * Manage canvas viewport state with optional clamping limits. May be
 * used controlled (pass `value` + `onChange`) or uncontrolled (omit
 * both — it manages its own state seeded from `initial`).
 *
 * @param options - Hook options.
 * @param options.initial - Initial viewport (default `{ x: 0, y: 0, zoom: 1 }`).
 * @param options.limits - Optional clamping limits applied on every update.
 * @param options.value - External viewport state (controlled mode).
 * @param options.onChange - External setter (controlled mode).
 * @returns The viewport state + helpers (`panBy`, `zoomBy`, `reset`).
 */
export function useCanvasViewport(options?: {
  initial?: CanvasViewport
  limits?: ViewportLimits
  value?: CanvasViewport
  onChange?: (next: CanvasViewport) => void
}): UseCanvasViewportResult {
  // Seed once via a ref so subsequent renders with a different `initial`
  // don't reset state — that's `reset()`'s job.
  const initialRef = useRef<CanvasViewport>(options?.initial ?? { x: 0, y: 0, zoom: 1 })
  const [internal, setInternal] = useState<CanvasViewport>(initialRef.current)
  const limits = options?.limits
  const isControlled = options?.value !== undefined
  const viewport = isControlled ? (options!.value as CanvasViewport) : internal

  const setViewport = useCallback(
    (next: CanvasViewport) => {
      const clamped = clampViewport(next, limits)
      if (options?.onChange) options.onChange(clamped)
      if (!isControlled) setInternal(clamped)
    },
    [isControlled, limits, options],
  )

  const panBy = useCallback(
    (deltaX: number, deltaY: number) => {
      const safeZoom = viewport.zoom === 0 ? 1 : viewport.zoom
      setViewport({
        x: viewport.x - deltaX / safeZoom,
        y: viewport.y - deltaY / safeZoom,
        zoom: viewport.zoom,
      })
    },
    [viewport, setViewport],
  )

  const zoomBy = useCallback(
    (factor: number, focalScreenX: number, focalScreenY: number) => {
      if (factor <= 0) return
      const safeZoom = viewport.zoom === 0 ? 1 : viewport.zoom
      const focalCanvasX = focalScreenX / safeZoom + viewport.x
      const focalCanvasY = focalScreenY / safeZoom + viewport.y
      const nextZoom = viewport.zoom * factor
      const nextX = focalCanvasX - focalScreenX / nextZoom
      const nextY = focalCanvasY - focalScreenY / nextZoom
      setViewport({ x: nextX, y: nextY, zoom: nextZoom })
    },
    [viewport, setViewport],
  )

  const reset = useCallback(() => {
    setViewport(initialRef.current)
  }, [setViewport])

  return { viewport, setViewport, panBy, zoomBy, reset }
}

/** Result of {@link useCanvasSelection}. */
export interface UseCanvasSelectionResult {
  /** Read-only selected ids. */
  selected: ReadonlySet<CanvasItemId>
  /** `true` if `id` is in the selection. */
  isSelected: (id: CanvasItemId) => boolean
  /**
   * Replace the selection. If `additive` is true, `ids` are merged into
   * the existing selection; otherwise the selection is replaced.
   */
  select: (ids: readonly CanvasItemId[], additive?: boolean) => void
  /** Toggle a single id's membership. */
  toggle: (id: CanvasItemId) => void
  /** Remove a single id. */
  deselect: (id: CanvasItemId) => void
  /** Clear the entire selection. */
  clear: () => void
}

/**
 * Manage a selection set of canvas item ids with idiomatic helpers.
 * Pure JS state — no DOM coupling, no domain assumptions.
 *
 * Controlled mode: pass `value` + `onChange`. Uncontrolled mode: omit
 * both; the hook owns its own state seeded from `initial`.
 *
 * @param options - Hook options.
 * @param options.initial - Initial selection set (default empty).
 * @param options.value - External selection (controlled mode).
 * @param options.onChange - External setter (controlled mode).
 * @returns The selection set + helpers.
 */
export function useCanvasSelection(options?: {
  initial?: readonly CanvasItemId[]
  value?: ReadonlySet<CanvasItemId>
  onChange?: (next: ReadonlySet<CanvasItemId>) => void
}): UseCanvasSelectionResult {
  const initialRef = useRef<Set<CanvasItemId>>(new Set(options?.initial ?? []))
  const [internal, setInternal] = useState<Set<CanvasItemId>>(initialRef.current)
  const isControlled = options?.value !== undefined
  const selected: ReadonlySet<CanvasItemId> = isControlled
    ? (options!.value as ReadonlySet<CanvasItemId>)
    : internal

  const apply = useCallback(
    (next: Set<CanvasItemId>) => {
      if (options?.onChange) options.onChange(next)
      if (!isControlled) setInternal(next)
    },
    [isControlled, options],
  )

  const isSelected = useCallback((id: CanvasItemId) => selected.has(id), [selected])

  const select = useCallback(
    (ids: readonly CanvasItemId[], additive = false) => {
      const next = new Set<CanvasItemId>(additive ? selected : [])
      for (const id of ids) next.add(id)
      apply(next)
    },
    [apply, selected],
  )

  const toggle = useCallback(
    (id: CanvasItemId) => {
      const next = new Set<CanvasItemId>(selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      apply(next)
    },
    [apply, selected],
  )

  const deselect = useCallback(
    (id: CanvasItemId) => {
      if (!selected.has(id)) return
      const next = new Set<CanvasItemId>(selected)
      next.delete(id)
      apply(next)
    },
    [apply, selected],
  )

  const clear = useCallback(() => {
    if (selected.size === 0) return
    apply(new Set<CanvasItemId>())
  }, [apply, selected])

  return { selected, isSelected, select, toggle, deselect, clear }
}
