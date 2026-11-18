/**
 * Svelte context wiring for {@link useAuthFormState}.
 *
 * `<AuthShell>` publishes the shared state through `setContext` so any auth
 * form rendered inside inherits cross-view email persistence — call
 * `useAuthFormStateContext()` from the form to bind the shared `email` (and
 * other shared fields) and to `clear()` on successful auth.
 *
 * @module
 */

import { getContext } from 'svelte'

import { AUTH_FORM_STATE_KEY } from './keys.js'
import type { AuthFormState } from './types.js'

/**
 * Reads the shared auth form state from the nearest
 * {@link AuthFormStateProvider} (which `<AuthShell>` renders by default).
 *
 * @returns The shared {@link AuthFormState}.
 * @throws {Error} If called outside an `<AuthFormStateProvider>`/`<AuthShell>`.
 */
export function useAuthFormStateContext(): AuthFormState {
  const state = getContext<AuthFormState | undefined>(AUTH_FORM_STATE_KEY)
  if (!state) {
    throw new Error(
      'useAuthFormStateContext must be used within an <AuthFormStateProvider> (or <AuthShell>, which renders one).',
    )
  }
  return state
}
