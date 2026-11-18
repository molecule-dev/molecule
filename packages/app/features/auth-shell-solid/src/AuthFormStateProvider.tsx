/**
 * Solid context wiring for {@link useAuthFormState}.
 *
 * `<AuthShell>` wraps its content in `<AuthFormStateProvider>` so any auth form
 * rendered inside inherits cross-view email persistence — call
 * `useAuthFormStateContext()` from the form to bind the shared `email` (and
 * other shared fields) and to `clear()` on successful auth.
 *
 * @module
 */

import { createContext, type JSX, useContext } from 'solid-js'

import type { AuthFormState, AuthFormStateProviderProps } from './types.js'
import { useAuthFormState } from './useAuthFormState.js'

/** The context under which {@link AuthFormStateProvider} publishes the shared state. */
const AuthFormStateContext = createContext<AuthFormState>()

/**
 * Provides a single {@link useAuthFormState} instance to all descendants via
 * Solid's context, so sibling/child auth forms share the same email.
 *
 * @param props - Children plus optional storage provider, key, and seed fields.
 * @returns The provider component.
 */
export function AuthFormStateProvider(props: AuthFormStateProviderProps): JSX.Element {
  const state = useAuthFormState({
    storage: props.storage,
    storageKey: props.storageKey,
    initialFields: props.initialFields,
  })
  return (
    <AuthFormStateContext.Provider value={state}>{props.children}</AuthFormStateContext.Provider>
  )
}

/**
 * Reads the shared auth form state from the nearest
 * {@link AuthFormStateProvider} (which `<AuthShell>` renders by default).
 *
 * @returns The shared {@link AuthFormState}.
 * @throws {Error} If called outside an `<AuthFormStateProvider>`/`<AuthShell>`.
 */
export function useAuthFormStateContext(): AuthFormState {
  const state = useContext(AuthFormStateContext)
  if (!state) {
    throw new Error(
      'useAuthFormStateContext must be used within an <AuthFormStateProvider> (or <AuthShell>, which renders one).',
    )
  }
  return state
}
