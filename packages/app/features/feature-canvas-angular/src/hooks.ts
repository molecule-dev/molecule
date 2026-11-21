/**
 * Internal-state hooks for the canvas: viewport (camera) and selection
 * set management. Both support a "controlled" mode via optional external
 * state and an "uncontrolled" mode that owns its own state.
 *
 * Each takes its options either as a plain value or as a signal, so a parent
 * can hand new options to the SAME instance — the counterpart of React
 * re-rendering the hook with a new options object.
 *
 * @module
 */

import { isSignal, type Signal, signal } from '@angular/core'

import { clampViewport } from './coordinates.js'
import type {
  CanvasItemId,
  CanvasViewport,
  UseCanvasSelectionResult,
  UseCanvasViewportResult,
  ViewportLimits,
} from './types.js'

/** Options of a hook: a plain value, or a signal a parent keeps current. */
type OptionsSource<T> = T | Signal<T>

/**
 * Reads an options source (a signal's current value, or the value itself).
 *
 * @param source - The options source.
 * @returns The current options.
 */
function readSource<T>(source: OptionsSource<T> | undefined): T | undefined {
  if (source === undefined) return undefined
  return isSignal(source) ? source() : source
}

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
 * @param options - Hook options, plain or as a signal.
 * @returns The viewport state + helpers (`panBy`, `zoomBy`, `reset`).
 */
export function useCanvasViewport(
  options?: OptionsSource<CanvasViewportOptions | undefined>,
): UseCanvasViewportResult {
  // Seed once, when the hook is created: a later `initial` does not reset the
  // viewport — that is `reset()`'s job (React's `useRef` seed).
  const seed: CanvasViewport = readSource(options)?.initial ?? { x: 0, y: 0, zoom: 1 }
  const internal = signal<CanvasViewport>(seed)

  /** The viewport the caller supplied, while the hook is controlled. */
  const viewport = (): CanvasViewport => readSource(options)?.value ?? internal()

  const setViewport = (next: CanvasViewport): void => {
    const current = readSource(options)
    const clamped = clampViewport(next, current?.limits)
    current?.onChange?.(clamped)
    if (current?.value === undefined) internal.set(clamped)
  }

  const panBy = (deltaX: number, deltaY: number): void => {
    const vp = viewport()
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    setViewport({
      x: vp.x - deltaX / safeZoom,
      y: vp.y - deltaY / safeZoom,
      zoom: vp.zoom,
    })
  }

  const zoomBy = (factor: number, focalScreenX: number, focalScreenY: number): void => {
    if (factor <= 0) return
    const vp = viewport()
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

  return {
    get viewport(): CanvasViewport {
      return viewport()
    },
    setViewport,
    panBy,
    zoomBy,
    reset,
  }
}

/**
 * Manage a selection set of canvas item ids with idiomatic helpers.
 * Pure JS state — no DOM coupling, no domain assumptions.
 *
 * Controlled mode: pass `value` + `onChange`. Uncontrolled mode: omit
 * both; the hook owns its own state seeded from `initial`.
 *
 * @param options - Hook options, plain or as a signal.
 * @returns The selection set + its helpers.
 */
export function useCanvasSelection(
  options?: OptionsSource<CanvasSelectionOptions | undefined>,
): UseCanvasSelectionResult {
  // React's `useState` seed: read once, when the hook is created.
  const internal = signal<ReadonlySet<CanvasItemId>>(new Set(readSource(options)?.initial ?? []))
  const selected = (): ReadonlySet<CanvasItemId> => readSource(options)?.value ?? internal()

  const apply = (next: Set<CanvasItemId>): void => {
    const current = readSource(options)
    current?.onChange?.(next)
    if (current?.value === undefined) internal.set(next)
  }

  const isSelected = (id: CanvasItemId): boolean => selected().has(id)

  const select = (ids: readonly CanvasItemId[], additive = false): void => {
    const next = new Set<CanvasItemId>(additive ? selected() : [])
    for (const id of ids) next.add(id)
    apply(next)
  }

  const toggle = (id: CanvasItemId): void => {
    const next = new Set<CanvasItemId>(selected())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    apply(next)
  }

  const deselect = (id: CanvasItemId): void => {
    if (!selected().has(id)) return
    const next = new Set<CanvasItemId>(selected())
    next.delete(id)
    apply(next)
  }

  const clear = (): void => {
    if (selected().size === 0) return
    apply(new Set<CanvasItemId>())
  }

  return {
    get selected(): ReadonlySet<CanvasItemId> {
      return selected()
    },
    isSelected,
    select,
    toggle,
    deselect,
    clear,
  }
}
