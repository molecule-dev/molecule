/**
 * The settings-panel container context — Angular's publication of React's
 * `SettingsPanelContext`.
 *
 * The container registers its context value on its own host element (see
 * `container-context.ts`, an internal module the barrel does not export) and
 * sections look it up by walking their DOM ancestors — the same "nearest
 * enclosing provider in the rendered tree" semantics React has.
 *
 * @module
 */

import { ElementRef, inject } from '@angular/core'

import { settingsPanelContext } from './container-context.js'
import type { SettingsPanelContextValue } from './types.js'

/**
 * Names the container context `SettingsContainer` publishes and sections
 * consume (React's `SettingsPanelContext` object). Angular's counterpart is
 * the DOM-scoped registration on the container's host element; this constant
 * documents and keys that contract.
 */
export const SettingsPanelContext = 'molecule-settings-panel-context'

/**
 * Reads the `onClose` handler exposed by the parent `<SettingsContainer>`.
 * Throws if used outside the container so component misuse is loud.
 *
 * The lookup is deferred to the first property read (an event handler, long
 * after Angular has created and attached every element), so a section nested
 * in projected content resolves the container reliably.
 *
 * @returns The container context.
 */
export function useSettingsPanelContext(): SettingsPanelContextValue {
  const host = inject(ElementRef).nativeElement as HTMLElement
  const resolve = (): SettingsPanelContextValue => {
    const value = settingsPanelContext.find(host)
    if (!value) {
      throw new Error(
        'Settings panel section components must be rendered inside <SettingsContainer>.',
      )
    }
    return value
  }
  return {
    get onClose(): () => void {
      return resolve().onClose
    },
  }
}
