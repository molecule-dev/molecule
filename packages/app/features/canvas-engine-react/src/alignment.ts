/**
 * Pure alignment + distribution helpers. Operate on top-level layer
 * arrays and selection sets, returning a new layer array — so they
 * compose cleanly with the engine's history stack.
 *
 * @module
 */

import { combinedBounds, elementBounds, translateElement } from './geometry.js'
import type {
  CanvasAlignment,
  CanvasDistribution,
  CanvasSelection,
  VectorElement,
} from './types.js'

/**
 * Apply an alignment op to every selected layer, returning the new
 * layers array. Layers not in the selection are passed through.
 *
 * @param layers - Top-level layer list.
 * @param selection - Ids of layers to operate on.
 * @param mode - Alignment mode.
 * @returns New layer list with aligned elements.
 */
export function alignLayers(
  layers: readonly VectorElement[],
  selection: CanvasSelection,
  mode: CanvasAlignment,
): VectorElement[] {
  const selected = layers.filter((l) => selection.includes(l.id))
  if (selected.length < 2) return layers.slice()
  const env = combinedBounds(selected)
  return layers.map((layer) => {
    if (!selection.includes(layer.id)) return layer
    const b = elementBounds(layer)
    let dx = 0
    let dy = 0
    switch (mode) {
      case 'left':
        dx = env.x - b.x
        break
      case 'right':
        dx = env.x + env.width - (b.x + b.width)
        break
      case 'center':
        dx = env.x + env.width / 2 - (b.x + b.width / 2)
        break
      case 'top':
        dy = env.y - b.y
        break
      case 'bottom':
        dy = env.y + env.height - (b.y + b.height)
        break
      case 'middle':
        dy = env.y + env.height / 2 - (b.y + b.height / 2)
        break
    }
    return translateElement(layer, dx, dy)
  })
}

/**
 * Distribute three or more selected layers evenly across the given
 * axis between the outermost layers (which stay put). Returns a new
 * layer list. For fewer than three selected items the input is
 * returned unchanged.
 *
 * @param layers - Top-level layer list.
 * @param selection - Ids of layers to operate on.
 * @param axis - Distribution axis.
 * @returns New layer list with distributed elements.
 */
export function distributeLayers(
  layers: readonly VectorElement[],
  selection: CanvasSelection,
  axis: CanvasDistribution,
): VectorElement[] {
  const selected = layers.filter((l) => selection.includes(l.id))
  if (selected.length < 3) return layers.slice()
  const ordered = [...selected].sort((a, b) => {
    const ba = elementBounds(a)
    const bb = elementBounds(b)
    return axis === 'horizontal' ? ba.x - bb.x : ba.y - bb.y
  })
  const first = elementBounds(ordered[0]!)
  const last = elementBounds(ordered[ordered.length - 1]!)
  const totalSpan =
    axis === 'horizontal' ? last.x + last.width - first.x : last.y + last.height - first.y
  let occupied = 0
  for (const item of ordered) {
    const b = elementBounds(item)
    occupied += axis === 'horizontal' ? b.width : b.height
  }
  const gaps = ordered.length - 1
  const gap = (totalSpan - occupied) / gaps
  // Compute desired left/top of each interior item.
  const offsets = new Map<string, number>()
  let cursor = axis === 'horizontal' ? first.x + first.width : first.y + first.height
  for (let i = 1; i < ordered.length - 1; i++) {
    const item = ordered[i]!
    const b = elementBounds(item)
    const desired = cursor + gap
    const current = axis === 'horizontal' ? b.x : b.y
    offsets.set(item.id, desired - current)
    cursor = desired + (axis === 'horizontal' ? b.width : b.height)
  }
  return layers.map((layer) => {
    const delta = offsets.get(layer.id)
    if (delta == null) return layer
    return axis === 'horizontal'
      ? translateElement(layer, delta, 0)
      : translateElement(layer, 0, delta)
  })
}
