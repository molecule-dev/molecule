/**
 * DOM geometry and pointer containment for anchored dropdowns.
 *
 * @module
 */

import {
  calculateOverlayPosition,
  type DropdownProps,
  type ElementBox,
  type OverlayAnchorGeometry,
  type OverlayPosition,
  type TooltipPlacement,
} from '@molecule/app-ui'

type Placement = NonNullable<DropdownProps['placement']>
type Align = NonNullable<DropdownProps['align']>

const origin = { scrollX: 0, scrollY: 0 }

/** Reads a browser element's bounds synchronously, including SVG and foreign documents. */
export function readOverlayBox(element: Element): ElementBox {
  const { left: x, top: y, width, height } = element.getBoundingClientRect()
  return { x, y, width, height }
}

/** HTML layout width, which excludes transforms. SVG anchors have no layout width. */
export function readOverlayAnchorWidth(anchor: Element): number | undefined {
  return 'offsetWidth' in anchor && typeof anchor.offsetWidth === 'number'
    ? anchor.offsetWidth
    : undefined
}

/**
 * Reads a web overlay's placement in page coordinates, with scrollbars excluded from the bounds.
 * @param anchor - Mounted anchor.
 * @param surface - Mounted overlay surface.
 * @param geometry - Placement, offset, padding and collision policy.
 * @returns Position relative to the document portal.
 */
export function measureOverlayPosition(
  anchor: Element,
  surface: Element,
  geometry: OverlayAnchorGeometry,
): OverlayPosition {
  const { documentElement, defaultView } = anchor.ownerDocument
  const { scrollX, scrollY } = defaultView ?? origin
  const position = calculateOverlayPosition(
    readOverlayBox(anchor),
    readOverlayBox(surface),
    { x: 0, y: 0, width: documentElement.clientWidth, height: documentElement.clientHeight },
    geometry,
  )
  return { ...position, top: position.top + scrollY, left: position.left + scrollX }
}

/** Places a tooltip inside its own viewport with the kit's 8px gap and margin. */
export function measureTooltipPosition(
  anchor: Element,
  surface: Element,
  placement: TooltipPlacement,
): OverlayPosition {
  return measureOverlayPosition(anchor, surface, {
    placement,
    offset: 8,
    padding: 8,
    collision: 'shift',
  })
}

/**
 * Calculates absolute menu offsets from viewport rectangles and page scroll.
 *
 * @param trigger - The trigger rectangle.
 * @param menu - The menu rectangle.
 * @param placement - The desired side and optional edge of the trigger.
 * @param align - The alignment for top and bottom placements.
 * @param offset - The gap between the trigger and menu in CSS pixels.
 * @param scroll - The page scroll in the trigger's window.
 * @returns The top and left offsets in CSS pixels.
 */
export function calculateDropdownPosition(
  trigger: DOMRectReadOnly,
  menu: DOMRectReadOnly,
  placement: Placement,
  align: Align,
  offset = 4,
  { scrollX, scrollY }: Pick<Window, 'scrollX' | 'scrollY'> = origin,
): { top: number; left: number } {
  const { top, left } = calculateOverlayPosition(
    { x: trigger.left, y: trigger.top, width: trigger.width, height: trigger.height },
    menu,
    { x: 0, y: 0, width: 0, height: 0 },
    { placement, align, offset, padding: 0, collision: 'none' },
  )
  return { top: top + scrollY, left: left + scrollX }
}

/**
 * Measures a dropdown in the coordinate space of its trigger's document.
 *
 * @param trigger - The mounted trigger.
 * @param menu - The mounted menu.
 * @param placement - The desired dropdown placement.
 * @param align - The alignment within the placement axis.
 * @returns The top and left offsets in CSS pixels.
 */
export function measureDropdownPosition(
  trigger: Element,
  menu: Element,
  placement: Placement,
  align: Align,
): { top: number; left: number } {
  const { top, left } = measureOverlayPosition(trigger, menu, {
    placement,
    align,
    offset: 4,
    padding: 0,
    collision: 'none',
  })
  return { top, left }
}

/**
 * Checks whether a dispatched pointer event reached either part of an anchored overlay.
 *
 * @param event - The event on the owner document.
 * @param trigger - The mounted trigger.
 * @param surface - The mounted menu.
 * @returns Whether the event originated outside both elements.
 */
export function isOutsideOverlay(event: Event, trigger: Element, surface: Element): boolean {
  const path = event.composedPath()
  return !path.includes(trigger) && !path.includes(surface)
}
