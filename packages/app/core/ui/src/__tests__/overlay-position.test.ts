import { expect, it } from 'vitest'

import type { OverlayAnchorGeometry } from '../overlay.js'
import { calculateOverlayPosition } from '../overlay-position.js'
import type { TooltipPlacement } from '../types.js'

const anchor = { x: 100, y: 100, width: 40, height: 20 }
const surface = { width: 30, height: 10 }
const viewport = { x: 0, y: 0, width: 240, height: 240 }
const geometry: OverlayAnchorGeometry = {
  placement: 'top',
  offset: 8,
  padding: 8,
  collision: 'none',
}

it.each<[TooltipPlacement, number, number]>([
  ['top', 105, 82],
  ['top-start', 100, 82],
  ['top-end', 110, 82],
  ['bottom', 105, 128],
  ['bottom-start', 100, 128],
  ['bottom-end', 110, 128],
  ['left', 62, 105],
  ['right', 148, 105],
])('places an anchored surface at %s', (placement, left, top) => {
  expect(calculateOverlayPosition(anchor, surface, viewport, { ...geometry, placement })).toEqual({
    left,
    top,
    placement,
  })
})

it('flips to the opposite side and keeps the requested edge alignment', () => {
  const placement = calculateOverlayPosition({ ...anchor, y: 10 }, surface, viewport, {
    ...geometry,
    placement: 'top-end',
    align: 'start',
    collision: 'flip-shift',
  })
  expect(placement).toEqual({ left: 110, top: 38, placement: 'bottom-end' })
})

it('preserves the requested side on a flip tie and shifts oversized content to the leading inset', () => {
  const placement = calculateOverlayPosition(
    { x: 35, y: 40, width: 30, height: 20 },
    { width: 150, height: 75 },
    { x: 0, y: 0, width: 100, height: 100 },
    { ...geometry, collision: 'flip-shift' },
  )
  expect(placement).toEqual({ left: 8, top: 8, placement: 'top' })
})

it('clamps to the same rectangle when its origin is scrolled', () => {
  const position = calculateOverlayPosition(
    { x: 205, y: 150, width: 20, height: 10 },
    surface,
    { x: 200, y: 140, width: 100, height: 120 },
    { ...geometry, collision: 'shift' },
  )
  expect(position).toEqual({ left: 208, top: 148, placement: 'top' })
})
