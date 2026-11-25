/**
 * Placement of anchored surfaces in a common coordinate space.
 * @module
 */

import type { ElementBox } from './elements.js'
import type { OverlayAnchorGeometry } from './overlay.js'
import type { TooltipPlacement } from './types.js'

/** The positioned surface's origin, and the side it ended up on. */
export interface OverlayPosition {
  top: number
  left: number
  placement: TooltipPlacement
}

const opposite: Record<TooltipPlacement, TooltipPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
  'top-start': 'bottom-start',
  'top-end': 'bottom-end',
  'bottom-start': 'top-start',
  'bottom-end': 'top-end',
}

/** Places a surface on one side of the anchor, accounting for its cross-axis alignment. */
function place(
  anchor: ElementBox,
  surface: Pick<ElementBox, 'width' | 'height'>,
  placement: TooltipPlacement,
  align: OverlayAnchorGeometry['align'],
  offset: number,
): OverlayPosition {
  const { x, y, width, height } = anchor
  if (placement === 'left' || placement === 'right') {
    return {
      placement,
      top: y + height / 2 - surface.height / 2,
      left: placement === 'left' ? x - surface.width - offset : x + width + offset,
    }
  }
  const alignment = placement.endsWith('-start')
    ? 'start'
    : placement.endsWith('-end')
      ? 'end'
      : align
  return {
    placement,
    top: placement.startsWith('top') ? y - surface.height - offset : y + height + offset,
    left:
      alignment === 'start'
        ? x
        : alignment === 'end'
          ? x + width - surface.width
          : x + width / 2 - surface.width / 2,
  }
}

/** Keeps the leading edge visible even when there is no room for the entire surface. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), Math.max(min, max))
}

/**
 * Positions an anchored surface. All inputs use the same coordinate space.
 * When flipping is enabled, the less obstructed side wins and ties keep the requested side.
 *
 * @param anchor - Bounds of the reference element.
 * @param surface - Dimensions of the surface to position.
 * @param viewport - Available bounds before applying padding.
 * @param geometry - Placement, gap, padding and collision policy.
 * @returns Coordinates in the input space and the resolved placement.
 */
export function calculateOverlayPosition(
  anchor: ElementBox,
  surface: Pick<ElementBox, 'width' | 'height'>,
  viewport: ElementBox,
  { placement, align, offset, padding, collision }: OverlayAnchorGeometry,
): OverlayPosition {
  let positioned = place(anchor, surface, placement, align, offset)
  if (collision === 'none') return positioned

  const minX = viewport.x + padding
  const minY = viewport.y + padding
  const maxX = viewport.x + viewport.width - padding - surface.width
  const maxY = viewport.y + viewport.height - padding - surface.height
  if (collision === 'flip-shift') {
    const flipped = place(anchor, surface, opposite[placement], align, offset)
    // Only overflow along the placement axis can be improved by flipping.
    const overflow = ({ left, top }: OverlayPosition): number =>
      placement === 'left' || placement === 'right'
        ? Math.max(0, minX - left) + Math.max(0, left - maxX)
        : Math.max(0, minY - top) + Math.max(0, top - maxY)
    if (overflow(flipped) < overflow(positioned)) positioned = flipped
  }
  return {
    placement: positioned.placement,
    left: clamp(positioned.left, minX, maxX),
    top: clamp(positioned.top, minY, maxY),
  }
}
