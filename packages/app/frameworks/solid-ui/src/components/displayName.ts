/**
 * React-style component naming for the Solid components.
 *
 * React's `forwardRef` components are objects that carry a `displayName`; a
 * Solid component is a plain function with no such property. The package
 * attaches the same `displayName` React's counterpart carries so callers (and
 * the parity tests) observe the same component metadata on both bindings.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A Solid component carrying the `displayName` its React counterpart exposes. */
export type NamedComponent<P> = ((props: P) => JSX.Element) & { displayName: string }

/**
 * Attaches a `displayName` to a Solid component.
 *
 * @param component - The component function.
 * @param displayName - The name React's counterpart carries.
 * @returns The same component, now carrying `displayName`.
 */
export const withDisplayName = <P>(
  component: (props: P) => JSX.Element,
  displayName: string,
): NamedComponent<P> => Object.assign(component, { displayName })
