/**
 * Render and event helpers shared by the Solid whiteboard canvas tests.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

const disposers: Array<() => void> = []

/**
 * Renders a view with Solid's browser renderer into a fresh host element.
 *
 * @param view - The view to render.
 * @returns The host element.
 */
export function mountView(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * Unmounts everything mounted through this module and clears the document.
 */
export function cleanup(): void {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
}

/**
 * Dispatches one pointer event the way a browser's primary mouse pointer does.
 *
 * @param el - The element to dispatch on.
 * @param type - The event type.
 * @param init - Its client position, pointer id and button.
 */
export function firePointer(
  el: Element,
  type: string,
  init: { clientX?: number; clientY?: number; pointerId?: number; button?: number } = {},
): void {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: init.pointerId ?? 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: init.button ?? 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: init.clientX ?? 0,
      clientY: init.clientY ?? 0,
    }),
  )
}
