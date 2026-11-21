/**
 * Internal-state composables for the canvas: viewport (camera) and selection
 * set management. Both support a "controlled" mode via optional external state
 * and an "uncontrolled" mode that owns its own state.
 *
 * Each takes its options either as a plain value or as a Vue reactive source
 * (a ref or a getter), so a parent can hand new options to the SAME instance —
 * the counterpart of React re-rendering the hook with a new options object.
 *
 * @module
 */

import { computed, type MaybeRefOrGetter, shallowRef, toValue } from 'vue'

import { clampViewport } from './coordinates.js'
import type {
  CanvasItemId,
  CanvasViewport,
  UseCanvasSelectionResult,
  UseCanvasViewportResult,
  ViewportLimits,
} from './types.js'

/** Options accepted by {@link useCanvasViewport}: a plain value, or the framework's own source. */
interface CanvasViewportOptions {
  initial?: CanvasViewport
  limits?: ViewportLimits
  value?: CanvasViewport
  onChange?: (next: CanvasViewport) => void
}

/** Options accepted by {@link useCanvasSelection}: a plain value, or the framework's own source. */
interface CanvasSelectionOptions {
  initial?: readonly CanvasItemId[]
  value?: ReadonlySet<CanvasItemId>
  onChange?: (next: ReadonlySet<CanvasItemId>) => void
}

/**
 * Manage canvas viewport state with optional clamping limits. May be
 * used controlled (pass `value` + `onChange`) or uncontrolled (omit
 * both — it manages its own state seeded from `initial`).
 *
 * @param options - Hook options, plain or as a ref/getter.
 * @returns The viewport state (a computed ref) + its helpers.
 */
export function useCanvasViewport(
  options?: MaybeRefOrGetter<CanvasViewportOptions | undefined>,
): UseCanvasViewportResult {
  const read = (): CanvasViewportOptions | undefined =>
    options === undefined ? undefined : toValue(options)
  // Seed once, at setup: a later `initial` does not reset the viewport — that
  // is `reset()`'s job (React's `useRef` seed).
  const seed: CanvasViewport = read()?.initial ?? { x: 0, y: 0, zoom: 1 }
  const internal = shallowRef<CanvasViewport>(seed)

  /** The viewport the caller supplied, while the hook is controlled. */
  const controlled = computed<CanvasViewport | undefined>(() => read()?.value)
  const viewport = computed<CanvasViewport>(() => controlled.value ?? internal.value)

  const setViewport = (next: CanvasViewport): void => {
    const current = read()
    const clamped = clampViewport(next, current?.limits)
    current?.onChange?.(clamped)
    if (current?.value === undefined) internal.value = clamped
  }

  const panBy = (deltaX: number, deltaY: number): void => {
    const vp = viewport.value
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    setViewport({
      x: vp.x - deltaX / safeZoom,
      y: vp.y - deltaY / safeZoom,
      zoom: vp.zoom,
    })
  }

  const zoomBy = (factor: number, focalScreenX: number, focalScreenY: number): void => {
    if (factor <= 0) return
    const vp = viewport.value
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    const focalCanvasX = focalScreenX / safeZoom + vp.x
    const focalCanvasY = focalScreenY / safeZoom + vp.y
    const nextZoom = vp.zoom * factor
    setViewport({
      x: focalCanvasX - focalScreenX / nextZoom,
      y: focalCanvasY - focalScreenY / nextZoom,
      zoom: nextZoom,
    })
  }

  const reset = (): void => {
    setViewport(seed)
  }

  return { viewport, setViewport, panBy, zoomBy, reset }
}

/**
 * Manage a selection set of canvas item ids with idiomatic helpers.
 * Pure state — no DOM coupling, no domain assumptions.
 *
 * Controlled mode: pass `value` + `onChange`. Uncontrolled mode: omit
 * both; the hook owns its own state seeded from `initial`.
 *
 * @param options - Hook options, plain or as a ref/getter.
 * @returns The selection set (a computed ref) + its helpers.
 */
export function useCanvasSelection(
  options?: MaybeRefOrGetter<CanvasSelectionOptions | undefined>,
): UseCanvasSelectionResult {
  const read = (): CanvasSelectionOptions | undefined =>
    options === undefined ? undefined : toValue(options)
  // React's `useState` seed: read once, at setup.
  const internal = shallowRef<ReadonlySet<CanvasItemId>>(new Set(read()?.initial ?? []))
  const controlled = computed<ReadonlySet<CanvasItemId> | undefined>(() => read()?.value)
  const selected = computed<ReadonlySet<CanvasItemId>>(() => controlled.value ?? internal.value)

  const apply = (next: Set<CanvasItemId>): void => {
    const current = read()
    current?.onChange?.(next)
    if (current?.value === undefined) internal.value = next
  }

  const isSelected = (id: CanvasItemId): boolean => selected.value.has(id)

  const select = (ids: readonly CanvasItemId[], additive = false): void => {
    const next = new Set<CanvasItemId>(additive ? selected.value : [])
    for (const id of ids) next.add(id)
    apply(next)
  }

  const toggle = (id: CanvasItemId): void => {
    const next = new Set<CanvasItemId>(selected.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    apply(next)
  }

  const deselect = (id: CanvasItemId): void => {
    if (!selected.value.has(id)) return
    const next = new Set<CanvasItemId>(selected.value)
    next.delete(id)
    apply(next)
  }

  const clear = (): void => {
    if (selected.value.size === 0) return
    apply(new Set<CanvasItemId>())
  }

  return { selected, isSelected, select, toggle, deselect, clear }
}
