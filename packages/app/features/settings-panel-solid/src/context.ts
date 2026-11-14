/**
 * The settings container's context, under React's export names.
 *
 * @module
 */

import { createContext, useContext } from 'solid-js'

import type { SettingsPanelContextValue } from './types.js'

const ctx = createContext<SettingsPanelContextValue | null>(null)

/** Solid context object for the settings panel; consume via `useSettingsPanelContext`. */
export const SettingsPanelContext = ctx

/**
 * Reads the `onClose` handler exposed by the parent `<SettingsContainer>`.
 * Throws if used outside the container so component misuse is loud.
 *
 * @returns The container's context value.
 * @throws {Error} When rendered outside `<SettingsContainer>`.
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
