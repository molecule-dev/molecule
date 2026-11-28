/**
 * How components flow in a line: the web reads it from CSS; the native kit is told.
 *
 * @module
 */

import type { InlineKind } from '@molecule/app-ui'

/**
 * Registers how a component flows inside a container that is not a flex container (see
 * {@link InlineKind}). A component that renders an inline element at its root (a button, a badge,
 * an icon) registers, so React Native puts it in the line beside text as the web does. The browser
 * lays inline content out from CSS, so on the web this does nothing.
 *
 * @param _component - The component.
 * @param _kind - Its kind for given props.
 */
export function registerInline(
  _component: unknown,
  _kind: (props: Record<string, unknown>) => InlineKind,
): void {
  // The browser lays inline content out from CSS; only the native kit needs to be told.
}
