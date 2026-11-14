import { inject, type InjectionKey } from 'vue'

/**
 * Context published by `<SettingsContainer>` to its children.
 *
 * The container owns the dismiss-the-panel handler; sub-components
 * that need to close after an action (logout, delete account, email
 * error) read it from context rather than threading the prop down.
 */
export interface SettingsPanelContextValue {
  /** Dismisses the settings panel; `<SettingsContainer>` receives it as a prop. */
  onClose: () => void
}

/**
 * Vue injection key for the settings panel context, published by
 * `<SettingsContainer>`; consume via `useSettingsPanelContext`.
 */
export const SettingsPanelContext: InjectionKey<SettingsPanelContextValue> =
  Symbol('molecule-settings-panel')

/**
 * Reads the `onClose` handler exposed by the parent `<SettingsContainer>`.
 * Throws if used outside the container so component misuse is loud.
 *
 * @returns The container's context value.
 */
export function useSettingsPanelContext(): SettingsPanelContextValue {
  const value = inject(SettingsPanelContext, null)
  if (!value) {
    throw new Error(
      'Settings panel section components must be rendered inside <SettingsContainer>.',
    )
  }
  return value
}
