/**
 * Pure geometry helpers shared by `<CanvasEngine>`, alignment, and the
 * marquee selector. No React, no DOM, no side effects.
 *
 * @module
 */

import type { Bounds } from '@molecule/app-feature-canvas-react'

import type { VectorElement, VectorElementId } from './types.js'

/**
 * Snap a value to the nearest multiple of `gridSize`. When `gridSize`
 * is `<= 0` the input is returned unchanged so callers don't have to
 * branch on "snap disabled".
 *
 * @param value - Value to snap (canvas units).
 * @param gridSize - Grid spacing in canvas units. `<= 0` disables snap.
 * @returns The snapped value.
 */
export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

/**
 * Compute the axis-aligned bounding box of a single element. Lines
 * use their two endpoints; every other kind uses its `x/y/width/height`.
 *
 * @param element - Element to measure.
 * @returns Bounding box in canvas-space coordinates.
 */
export function elementBounds(element: VectorElement): Bounds {
  if (element.kind === 'line') {
    const x = Math.min(element.x1, element.x2)
    const y = Math.min(element.y1, element.y2)
    return {
      x,
      y,
      width: Math.abs(element.x2 - element.x1),
      height: Math.abs(element.y2 - element.y1),
    }
  }
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  }
}

/**
 * Combine two bounding boxes into the smallest axis-aligned rect that
 * contains both. Useful for selection envelopes and group snapshots.
 *
 * @param a - First bounding box.
 * @param b - Second bounding box.
 * @returns The union rectangle.
 */
export function unionBounds(a: Bounds, b: Bounds): Bounds {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}

/**
 * Compute the bounding box that contains every element in the list.
 * Returns a zero-sized rect at the origin when `elements` is empty so
 * downstream code can blindly read the result.
 *
 * @param elements - Non-empty list of elements.
 * @returns Combined bounding box.
 */
export function combinedBounds(elements: readonly VectorElement[]): Bounds {
  if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let acc = elementBounds(elements[0]!)
  for (let i = 1; i < elements.length; i++) {
    acc = unionBounds(acc, elementBounds(elements[i]!))
  }
  return acc
}

/**
 * `true` when `bounds` and `box` overlap on both axes (touching edges
 * count as overlap). Used by the marquee selector.
 *
 * @param bounds - First rectangle.
 * @param box - Second rectangle.
 * @returns Whether the rects intersect.
 */
export function rectsIntersect(bounds: Bounds, box: Bounds): boolean {
  return (
    bounds.x <= box.x + box.width &&
    bounds.x + bounds.width >= box.x &&
    bounds.y <= box.y + box.height &&
    bounds.y + bounds.height >= box.y
  )
}

/**
 * Translate an element by `(dx, dy)` in canvas-space, returning a new
 * element. Group children are translated recursively so the group
 * stays internally consistent.
 *
 * @param element - Source element.
 * @param dx - X-axis displacement in canvas units.
 * @param dy - Y-axis displacement in canvas units.
 * @returns Translated element (new object).
 */
export function translateElement(element: VectorElement, dx: number, dy: number): VectorElement {
  if (element.kind === 'line') {
    return {
      ...element,
      x1: element.x1 + dx,
      y1: element.y1 + dy,
      x2: element.x2 + dx,
      y2: element.y2 + dy,
    }
  }
  if (element.kind === 'group') {
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
      children: element.children.map((c) => translateElement(c, dx, dy)),
    }
  }
  return { ...element, x: element.x + dx, y: element.y + dy }
}

/**
 * Look up an element by id within a flat list. Returns `undefined`
 * when not found — callers decide whether that's an error.
 *
 * @param elements - Source list.
 * @param id - Element id.
 * @returns The matching element or `undefined`.
 */
export function findElement(
  elements: readonly VectorElement[],
  id: VectorElementId,
): VectorElement | undefined {
  return elements.find((e) => e.id === id)
}
