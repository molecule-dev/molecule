import { createContext, useContext } from 'react'

/**
 * Context published by `<SettingsContainer>` to its children.
 *
 * The container owns the dismiss-the-panel handler; sub-components
 * that need to close after an action (logout, delete account, email
 * error) read it from context rather than threading the prop down.
 */
export interface SettingsPanelContextValue {
  onClose: () => void
}

const ctx = createContext<SettingsPanelContextValue | null>(null)

export const SettingsPanelContext = ctx

/**
 * Reads the `onClose` handler exposed by the parent `<SettingsContainer>`.
 * Throws if used outside the container so component misuse is loud.
 */
export function useSettingsPanelContext(): SettingsPanelContextValue {
  const value = useContext(ctx)
  if (!value) {
    throw new Error(
      'Settings panel section components must be rendered inside <SettingsContainer>.',
    )
  }
  return value
}
