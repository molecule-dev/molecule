/**
 * `SettingsContainer`'s own context registration — an internal module the
 * package barrel does not export.
 *
 * React context flows through the rendered tree, including projected
 * children. Angular DI does not: `<ng-content>` nodes keep their declaration
 * site's injector, so a provider on the container is invisible to sections
 * projected inside it. The container therefore registers the context value on
 * its own host ELEMENT (the same DOM-scoped mechanism
 * `@molecule/app-ui-angular` uses for its contexts) and sections look it up by
 * walking their DOM ancestors — the same "nearest enclosing provider in the
 * rendered tree" semantics React has.
 *
 * @module
 */

import { provideDomContext, removeDomContext } from '@molecule/app-ui-angular'

import type { SettingsPanelContextValue } from './types.js'

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
  provideDomContext(host, value)
  return () => {
    removeDomContext(host)
  }
}
