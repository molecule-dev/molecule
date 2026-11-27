/**
 * Shared DOM drag, hover, and focal zoom gestures for the Molecule web UI kits.
 *
 * Use the renderer's drag binding with `ElementDrag` or pass `{ drag, zoom }` from
 * `@molecule/app-ui` on a surface with focal wheel zoom and two-finger pinch.
 * All web kits share press ownership, pointer capture, touch intent, and
 * cancellation on pointer cancel, lost capture, window blur, and host removal.
 * Use `markPressTarget` for custom controls that must keep their own presses.
 * Use `bindWebHover` for one mouse or pen transition per boundary and
 * `bindWebWheelZoom` to handle Ctrl-wheel steps on a surface.
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
export * from './web-hover.js'
export * from './web-wheel-zoom.js'
