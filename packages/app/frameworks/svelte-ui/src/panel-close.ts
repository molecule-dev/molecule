/**
 * Panel-close context shared by `UserMenu` and `SidebarUserCard`, mirroring
 * the React package's `PanelCloseProvider` / `usePanelClose`: the component
 * that mounts a caller's panel in a drawer provides the close callback, and
 * panel content reads it with {@link usePanelClose}.
 *
 * @module
 */

import { getContext } from 'svelte'

/** Carries the close callback for the drawer a panel is mounted in. */
export interface PanelCloseContext {
  /** Callback that dismisses the enclosing drawer/modal. */
  close: () => void
}

/** The Svelte context key for {@link PanelCloseContext}. */
export const PANEL_CLOSE_CONTEXT = Symbol('molecule-panel-close')

/**
 * Returns the callback that dismisses the drawer the current panel is
 * mounted in. Safe to call anywhere — returns a no-op when no enclosing
 * `UserMenu` / `SidebarUserCard` provides one (e.g. a `SettingsPanel`
 * rendered as a standalone page).
 *
 * Like its React counterpart this reads context, so it is only legal during
 * component initialization.
 *
 * @returns A function that closes the enclosing drawer, or a no-op.
 */
export function usePanelClose(): () => void {
  return getContext<PanelCloseContext>(PANEL_CLOSE_CONTEXT)?.close ?? (() => undefined)
}
