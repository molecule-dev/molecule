/**
 * The element a component hands a caller's ref (see `BaseProps` in
 * `@molecule/app-ui`).
 *
 * A component that renders one main element gives the caller that element —
 * the one that takes `className` and `style` — as a read-only signal. A caller
 * takes the component with a template variable or `viewChild` and reads
 * `element()`; it is `null` while that element is not rendered (a closed
 * Tooltip, Dropdown or Modal).
 *
 * @module
 */

import { type ElementRef, type Signal, signal } from '@angular/core'

/**
 * A component that gives callers its ref element.
 *
 * Implemented by every component whose React export forwards a ref. The
 * generic is the element React's `forwardRef<E>` names.
 */
export interface HasElement<E extends Element> {
  /** The ref element, or `null` while it is not rendered. */
  readonly element: Signal<E | null>
}

/**
 * The ref element of a component whose host IS the element React forwards.
 *
 * The kit's selectors name the native element React renders at its root, so
 * the host element is that element.
 *
 * @param host - The component's host `ElementRef`.
 * @returns A read-only signal holding the host element.
 */
export const hostElement = <E extends Element>(host: ElementRef<E>): Signal<E | null> =>
  signal(host.nativeElement).asReadonly()
