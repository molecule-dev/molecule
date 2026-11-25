/**
 * DOM pointer drag gestures for the Molecule web UI kits.
 *
 * Use the renderer's drag binding with `ElementDrag` from `@molecule/app-ui`.
 * All web kits share press ownership, pointer capture, touch intent, and
 * cancellation on pointer cancel, lost capture, window blur, and host removal.
 * Use `markPressTarget` for custom controls that must keep their own presses.
 *
 * @example
 * ```ts
 * import { bindWebDrag } from '@molecule/app-pointer-events-dom'
 *
 * const host = document.querySelector<HTMLElement>('[data-mol-id="drag-handle"]')
 * if (host) {
 *   const binding = bindWebDrag(host, { onStart: (point) => console.log(point.x) })
 *   // Call binding.update(handlers) on updates and binding.destroy() on unmount.
 * }
 * ```
 *
 * @module
 */

export * from './web-drag.js'
