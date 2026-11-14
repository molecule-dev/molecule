/**
 * Context published by the `SettingsContainer` component to its sections —
 * the Svelte counterpart of `@molecule/app-settings-panel-react`'s
 * `SettingsPanelContext`: the container owns the dismiss-the-panel handler;
 * sub-components that need to close after an action (logout, delete account)
 * read it from context rather than threading the prop down.
 *
 * @module
 */

import { getContext } from 'svelte'

/** What the nearest `SettingsContainer` provides through context. */
export interface SettingsPanelContextValue {
  /** Dismisses the settings panel. */
  onClose: () => void
}

/**
 * The Svelte context key for the settings-panel context. `SettingsContainer`
 * provides the value with `setContext(SettingsPanelContext, …)` during its
 * initialization.
 */
export const SettingsPanelContext: symbol = Symbol('molecule-settings-panel')

/**
 * Reads the `onClose` handler exposed by the parent `SettingsContainer`.
 * Throws if used outside the container so component misuse is loud. Reads
 * Svelte context, so it is only legal during component initialization.
 *
 * @returns The container's context value.
 * @throws {Error} When rendered outside a `SettingsContainer`.
 */
export function useSettingsPanelContext(): SettingsPanelContextValue {
  const value = getContext<SettingsPanelContextValue | undefined>(SettingsPanelContext)
  if (!value) {
    throw new Error(
      'Settings panel section components must be rendered inside <SettingsContainer>.',
    )
  }
  return value
}
