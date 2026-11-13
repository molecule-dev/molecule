/**
 * Panel-close context shared by `UserMenu` and `SidebarUserCard`.
 *
 * Both components mount caller-supplied panel content (the default slot,
 * typically an app's `SettingsPanel`) inside a drawer. The panel needs a
 * way to dismiss that drawer without an `onClose` prop-threaded render
 * prop: the component provides the close callback, and panel content
 * reads it with `usePanelClose()`.
 *
 * @module
 */

import { defineComponent, inject, type InjectionKey, type PropType, provide } from 'vue'

/**
 * Injection key carrying the close callback for the drawer a panel is
 * mounted in. Module-local, like React's context object: only this
 * package's provider and composable share it.
 */
const PanelCloseKey: InjectionKey<() => void> = Symbol('PanelClose')

/** The no-op `usePanelClose()` returns outside any provider. */
const noOpClose = (): void => undefined

/**
 * Provides the panel-close callback to descendants. Rendered internally
 * by `UserMenu` and `SidebarUserCard` around their default slot; apps do
 * not normally render this directly.
 *
 * Faithful port of `@molecule/app-ui-react`'s PanelCloseProvider: renders
 * its children with NO wrapper DOM, so the panel sees the same parent
 * element in both frameworks.
 */
export const PanelCloseProvider = defineComponent({
  name: 'MPanelCloseProvider',
  props: {
    /**
     * Callback that dismisses the enclosing drawer/modal. Required in
     * React's types but runtime-optional there too (the kit nests a
     * prop-less provider); left optional so legitimate nested renders do
     * not warn.
     */
    close: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    // Read through at call time so a re-provided `close` prop is honored,
    // like React re-rendering the provider with a new context value.
    provide(PanelCloseKey, () => props.close?.())
    return () => slots.default?.()
  },
})

/**
 * Returns the callback that dismisses the drawer the current panel is
 * mounted in. Call it during `setup` of any descendant of a
 * {@link PanelCloseProvider}.
 *
 * Safe to call anywhere — returns a no-op when no enclosing `UserMenu` /
 * `SidebarUserCard` provides one (e.g. a `SettingsPanel` rendered as a
 * standalone page), exactly like React's context default.
 *
 * @returns A function that closes the enclosing drawer, or a no-op.
 */
export function usePanelClose(): () => void {
  // Vue calls a function default as a factory, so this supplies
  // `noOpClose` itself as the injected value.
  return inject(PanelCloseKey, () => noOpClose)
}
