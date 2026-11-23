/**
 * `SettingsContainer`'s own context registration — an internal module the
 * package barrel does not export.
 *
 * React context flows through the rendered tree, including projected
 * children. Angular DI does not: `<ng-content>` nodes keep their declaration
 * site's injector, so a provider on the container is invisible to sections
 * projected inside it. The container therefore registers the context value on
 * its own host ELEMENT, in a context of its own (`createDomContext` from
 * `@molecule/app-ui-angular`), and sections look it up from their own host
 * through the rendered tree: the same "nearest enclosing provider" semantics
 * React has, with either host in or out of the page.
 *
 * @module
 */

import { createDomContext } from '@molecule/app-ui-angular'

import type { SettingsPanelContextValue } from './types.js'

/** React's `SettingsPanelContext`, in the rendered tree. */
export const settingsPanelContext =
  createDomContext<SettingsPanelContextValue>('SettingsPanelContext')

/**
 * Registers the container context on `SettingsContainer`'s host element. The
 * value closes over the container instance, so the context always exposes the
 * CURRENT `onClose` prop — React re-renders a new context value object when
 * the prop changes; reading the live field here has the same effect.
 *
 * @param host - The container's host element.
 * @param readOnClose - Reads the container's current `onClose` prop.
 * @returns A function that removes the registration (call on destroy).
 */
export function provideSettingsPanelContext(
  host: Element,
  readOnClose: () => (() => void) | undefined,
): () => void {
  const value: SettingsPanelContextValue = {
    onClose: () => {
      const onClose = readOnClose()
      if (onClose) onClose()
    },
  }
  settingsPanelContext.provide(host, value)
  return () => {
    settingsPanelContext.remove(host)
  }
}
