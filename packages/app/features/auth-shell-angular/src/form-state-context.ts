/**
 * Internal DOM-scoped context registration for the shared auth-form state — the
 * Angular counterpart of React's `AuthFormStateContext` provider. Not part of
 * the package's public surface.
 *
 * @module
 */

import { provideDomContext, removeDomContext } from '@molecule/app-ui-angular'

import type { AuthFormState } from './types.js'

/**
 * Registers the shared auth-form state on an element, so descendants resolve it
 * through the DOM. Returns a function that removes the registration.
 *
 * @param host - The element that owns the state.
 * @param state - The shared state.
 * @returns A teardown that removes the registration.
 */
export function provideAuthFormState(host: Element, state: AuthFormState): () => void {
  provideDomContext(host, state)
  return () => {
    removeDomContext(host)
  }
}
