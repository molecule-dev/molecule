/**
 * Internal-state hooks for the canvas: viewport (camera) and selection
 * set management. Both support a "controlled" mode via optional external
 * state and an "uncontrolled" mode that owns its own state.
 *
 * Each returns a readable store of its result — the Svelte idiom for a value
 * that changes over time — and takes its options either as a plain value or as
 * a readable store, so a parent can hand new options to the SAME instance (the
 * counterpart of React re-rendering the hook with a new options object).
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'

import { clampViewport } from './coordinates.js'
import type {
  CanvasItemId,
  CanvasViewport,
  UseCanvasSelectionResult,
  UseCanvasViewportResult,
  ViewportLimits,
} from './types.js'

/** Options of a hook: a plain value, or a store a parent keeps current. */
type OptionsSource<T> = T | Readable<T>

/**
 * Whether a value is a readable store.
 *
 * @param value - Any value.
 * @returns True for `{ subscribe }`.
 */
const isReadable = (value: unknown): value is Readable<unknown> =>
  !!value && typeof (value as { subscribe?: unknown }).subscribe === 'function'

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
 * @param options - Hook options, plain or as a readable store.
 * @returns A readable store of the viewport state + its helpers.
 */
export function useCanvasViewport(
  options?: OptionsSource<CanvasViewportOptions | undefined>,
): Readable<UseCanvasViewportResult> {
  let current: CanvasViewportOptions | undefined = isReadable(options) ? get(options) : options
  // Seed once, when the hook is created: a later `initial` does not reset the
  // viewport — that is `reset()`'s job (React's `useRef` seed).
  const seed: CanvasViewport = current?.initial ?? { x: 0, y: 0, zoom: 1 }
  let internal: CanvasViewport = seed

  const viewportNow = (): CanvasViewport => current?.value ?? internal
  // Publishes the current result; wired to the store once it exists.
  let publish: () => void = () => {}

  const setViewport = (next: CanvasViewport): void => {
    const clamped = clampViewport(next, current?.limits)
    current?.onChange?.(clamped)
    if (current?.value === undefined) internal = clamped
    publish()
  }

  const panBy = (deltaX: number, deltaY: number): void => {
    const vp = viewportNow()
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    setViewport({
      x: vp.x - deltaX / safeZoom,
      y: vp.y - deltaY / safeZoom,
      zoom: vp.zoom,
    })
  }

  const zoomBy = (factor: number, focalScreenX: number, focalScreenY: number): void => {
    if (factor <= 0) return
    const vp = viewportNow()
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

  const snapshot = (): UseCanvasViewportResult => ({
    viewport: viewportNow(),
    setViewport,
    panBy,
    zoomBy,
    reset,
  })

  const reset = (): void => {
    setViewport(seed)
  }

  const store = writable<UseCanvasViewportResult>(snapshot())
  publish = (): void => store.set(snapshot())

  if (isReadable(options))
    onDestroy(
      options.subscribe((next) => {
        current = next
        publish()
      }),
    )

  return store
}

/**
 * Manage a selection set of canvas item ids with idiomatic helpers.
 * Pure JS state — no DOM coupling, no domain assumptions.
 *
 * Controlled mode: pass `value` + `onChange`. Uncontrolled mode: omit
 * both; the hook owns its own state seeded from `initial`.
 *
 * @param options - Hook options, plain or as a readable store.
 * @returns A readable store of the selection set + its helpers.
 */
export function useCanvasSelection(
  options?: OptionsSource<CanvasSelectionOptions | undefined>,
): Readable<UseCanvasSelectionResult> {
  let current: CanvasSelectionOptions | undefined = isReadable(options) ? get(options) : options
  // React's `useState` seed: read once, when the hook is created.
  let internal: ReadonlySet<CanvasItemId> = new Set(current?.initial ?? [])

  const selectedNow = (): ReadonlySet<CanvasItemId> => current?.value ?? internal
  // Publishes the current result; wired to the store once it exists.
  let publish: () => void = () => {}

  const apply = (next: Set<CanvasItemId>): void => {
    current?.onChange?.(next)
    if (current?.value === undefined) internal = next
    publish()
  }

  const isSelected = (id: CanvasItemId): boolean => selectedNow().has(id)

  const select = (ids: readonly CanvasItemId[], additive = false): void => {
    const next = new Set<CanvasItemId>(additive ? selectedNow() : [])
    for (const id of ids) next.add(id)
    apply(next)
  }

  const toggle = (id: CanvasItemId): void => {
    const next = new Set<CanvasItemId>(selectedNow())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    apply(next)
  }

  const deselect = (id: CanvasItemId): void => {
    if (!selectedNow().has(id)) return
    const next = new Set<CanvasItemId>(selectedNow())
    next.delete(id)
    apply(next)
  }

  const clear = (): void => {
    if (selectedNow().size === 0) return
    apply(new Set<CanvasItemId>())
  }

  const snapshot = (): UseCanvasSelectionResult => ({
    selected: selectedNow(),
    isSelected,
    select,
    toggle,
    deselect,
    clear,
  })

  const store = writable<UseCanvasSelectionResult>(snapshot())
  publish = (): void => store.set(snapshot())

  if (isReadable(options))
    onDestroy(
      options.subscribe((next) => {
        current = next
        publish()
      }),
    )

  return store
}
