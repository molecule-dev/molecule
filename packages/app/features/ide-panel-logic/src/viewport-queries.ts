/**
 * The media queries the IDE panels branch on for touch- and phone-aware
 * rendering. Each framework's viewport hooks subscribe to these. Consumers
 * (e.g. molecule.dev's Workspace) keep their own breakpoint in sync with
 * {@link NARROW_VIEWPORT_QUERY}'s 768px threshold.
 *
 * @module
 */

/**
 * The phone-width media query — matches viewports below 768px, mirroring the
 * host workspace's single-pane mobile breakpoint.
 */
export const NARROW_VIEWPORT_QUERY = '(max-width: 767px)'

/**
 * The touch-first media query — matches when the PRIMARY pointer is coarse
 * (finger), i.e. phones/tablets, regardless of viewport width.
 */
export const COARSE_POINTER_QUERY = '(pointer: coarse)'
