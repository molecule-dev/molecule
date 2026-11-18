import type { Layer } from './types.js'

/**
 * Move a layer from one index to another inside the panel array, returning a
 * fresh array. The display convention is **top-down** (index 0 is the
 * top-most layer in Photoshop terms — the front-most), so callers don't
 * have to reverse anything.
 *
 * Out-of-range indices are clamped to `[0, layers.length - 1]`. If the
 * source and destination resolve to the same index the original array
 * is returned unchanged (referential equality preserved).
 *
 * @param layers - Current ordered layers (top-down).
 * @param fromIndex - Index of the layer being moved.
 * @param toIndex - Destination index after the move.
 * @returns A new array reflecting the reordered layers, or the original
 *   reference if the move is a no-op.
 */
export function moveLayer(layers: readonly Layer[], fromIndex: number, toIndex: number): Layer[] {
  if (layers.length === 0) return layers as Layer[]
  const last = layers.length - 1
  const from = Math.min(Math.max(fromIndex, 0), last)
  const to = Math.min(Math.max(toIndex, 0), last)
  if (from === to) return layers as Layer[]
  const next = layers.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Format an opacity value (`0`..`1`) as a Photoshop-style integer
 * percent string (`"100%"`). Returns an empty string when opacity is
 * `undefined` so callers can render "no metadata" rows naturally.
 *
 * Values outside `[0, 1]` are clamped, fractional results are rounded
 * to the nearest integer.
 *
 * @param opacity - The 0–1 opacity, or `undefined`.
 * @returns A locale-agnostic `"NN%"` string, or `""` when opacity is undefined.
 */
export function formatOpacityPercent(opacity: number | undefined): string {
  if (opacity === undefined || Number.isNaN(opacity)) return ''
  const clamped = Math.min(Math.max(opacity, 0), 1)
  return `${Math.round(clamped * 100)}%`
}
