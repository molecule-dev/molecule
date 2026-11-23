/**
 * Internal DOM-scoped context registration for the shared auth-form state — the
 * Angular counterpart of React's `AuthFormStateContext` provider. Not part of
 * the package's public surface.
 *
 * @module
 */

import { createDomContext } from '@molecule/app-ui-angular'

import type { AuthFormState } from './types.js'

/** React's `AuthFormStateContext`, in the rendered tree. */
const authFormStateContext = createDomContext<AuthFormState>('AuthFormState')

/**
 * Registers the shared auth-form state on the provider's host, so the
 * components it renders resolve it through the rendered tree. Returns a
 * function that removes the registration.
 *
 * @param host - The provider's host element.
 * @param state - The shared state.
 * @returns A teardown that removes the registration.
 */
export function provideAuthFormState(host: Element, state: AuthFormState): () => void {
  authFormStateContext.provide(host, state)
  return () => {
    authFormStateContext.remove(host)
  }
}

/**
 * Finds the auth-form state of the nearest enclosing provider.
 *
 * @param host - The consumer's host element.
 * @returns The state, or `undefined` outside a provider.
 */
export function findAuthFormState(host: Element): AuthFormState | undefined {
  return authFormStateContext.find(host)
}
