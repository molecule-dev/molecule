/**
 * The settings-panel container context — Angular's publication of React's
 * `SettingsPanelContext`.
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

import { ElementRef, inject } from '@angular/core'

import { findDomContext, provideDomContext, removeDomContext } from '@molecule/app-ui-angular'

import type { SettingsPanelContextValue } from './types.js'

/**
 * Names the container context `SettingsContainer` publishes and sections
 * consume (React's `SettingsPanelContext` object). Angular's counterpart is
 * the DOM-scoped registration on the container's host element; this constant
 * documents and keys that contract.
 */
export const SettingsPanelContext = 'molecule-settings-panel-context'

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
    const value = findDomContext<SettingsPanelContextValue>(host)
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
