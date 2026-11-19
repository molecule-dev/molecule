/**
 * React-style component naming for the Vue components.
 *
 * React's `forwardRef` components are objects that carry a `displayName`; a
 * Vue component is a `defineComponent` options object whose `name` is its Vue
 * identifier (prefixed `M` in this package), with no `displayName`. The
 * package attaches the same `displayName` React's counterpart carries so
 * callers (and the parity tests) observe the same component metadata on both
 * bindings.
 *
 * @module
 */

/**
 * Attaches the `displayName` React's counterpart carries to a Vue component.
 *
 * Vue ignores the property; it exists so component metadata is identical on
 * both bindings.
 *
 * @param component - The component `defineComponent` returned.
 * @param displayName - The name React's counterpart carries.
 */
export const setDisplayName = (component: object, displayName: string): void => {
  Object.assign(component, { displayName })
}
