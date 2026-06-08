/**
 * Panel-close context shared by `UserMenu` and `SidebarUserCard`.
 *
 * Both components mount caller-supplied `children` (typically an app's
 * `SettingsPanel`) inside a drawer. The panel needs a way to dismiss
 * that drawer — historically passed down via a `renderPanel` render
 * prop. This context replaces that render prop: the component provides
 * the close callback, and panel content reads it with `usePanelClose()`.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { createContext, useContext } from 'react'

/**
 * Carries the close callback for the drawer a panel is mounted in.
 * Defaults to a no-op so `usePanelClose()` is always safe to call —
 * panel content rendered outside a drawer simply gets a close callback
 * that does nothing.
 */
const PanelCloseContext = createContext<() => void>(() => {})

/**
 * Props for {@link PanelCloseProvider}.
 */
export interface PanelCloseProviderProps {
  /** Callback that dismisses the enclosing drawer/modal. */
  close: () => void
  /** Panel content that may call {@link usePanelClose}. */
  children: ReactNode
}

/**
 * Provides the panel-close callback to descendants. Rendered internally
 * by `UserMenu` and `SidebarUserCard` around their `children`; apps do
 * not normally render this directly.
 *
 * @param props - The close callback and the panel content.
 * @returns The children wrapped in the close-context provider.
 */
export function PanelCloseProvider({ close, children }: PanelCloseProviderProps): JSX.Element {
  return <PanelCloseContext.Provider value={close}>{children}</PanelCloseContext.Provider>
}

/**
 * Returns the callback that dismisses the drawer the current panel is
 * mounted in. Safe to call anywhere — returns a no-op when no enclosing
 * `UserMenu` / `SidebarUserCard` provides one (e.g. a `SettingsPanel`
 * rendered as a standalone page).
 *
 * @returns A function that closes the enclosing drawer, or a no-op.
 */
export function usePanelClose(): () => void {
  return useContext(PanelCloseContext)
}
