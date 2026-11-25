/**
 * DOM geometry and pointer containment for anchored dropdowns.
 *
 * @module
 */

import type { DropdownProps } from '@molecule/app-ui'

type Placement = NonNullable<DropdownProps['placement']>
type Align = NonNullable<DropdownProps['align']>

const origin = { scrollX: 0, scrollY: 0 }

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
  let top = 0
  if (placement.startsWith('top')) {
    top = trigger.top + scrollY - menu.height - offset
  } else if (placement.startsWith('bottom')) {
    top = trigger.bottom + scrollY + offset
  } else if (placement === 'left' || placement === 'right') {
    top = trigger.top + scrollY + (trigger.height - menu.height) / 2
  }

  let left: number
  if (placement === 'left') {
    left = trigger.left + scrollX - menu.width - offset
  } else if (placement === 'right') {
    left = trigger.right + scrollX + offset
  } else if (placement.endsWith('-start') || (!placement.endsWith('-end') && align === 'start')) {
    left = trigger.left + scrollX
  } else if (placement.endsWith('-end') || align === 'end') {
    left = trigger.right + scrollX - menu.width
  } else {
    left = trigger.left + scrollX + (trigger.width - menu.width) / 2
  }

  return { top, left }
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
  return calculateDropdownPosition(
    trigger.getBoundingClientRect(),
    menu.getBoundingClientRect(),
    placement,
    align,
    4,
    trigger.ownerDocument.defaultView ?? undefined,
  )
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
