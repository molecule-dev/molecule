/**
 * Vue provide/inject wiring for {@link useAuthFormState}.
 *
 * `<AuthShell>` wraps its content in `<AuthFormStateProvider>` so any auth form
 * rendered inside inherits cross-view email persistence — call
 * `useAuthFormStateContext()` from the form to bind the shared `email` (and
 * other shared fields) and to `clear()` on successful auth. Apps that compose
 * the lower-level AuthShell primitives can wrap manually with
 * `<AuthFormStateProvider>`.
 *
 * @module
 */

import { defineComponent, inject, type InjectionKey, provide } from 'vue'

import type { AuthFormState } from './types.js'
import { useAuthFormState } from './useAuthFormState.js'

/** The injection key under which {@link AuthFormStateProvider} publishes the shared state. */
const AuthFormStateKey: InjectionKey<AuthFormState> = Symbol('molecule-auth-form-state')

/**
 * Provides a single {@link useAuthFormState} instance to all descendants via
 * provide/inject, so sibling/child auth forms share the same email.
 *
 * @param props - Children plus optional storage provider, key, and seed fields.
 * @returns The provider component.
 */
export const AuthFormStateProvider = defineComponent({
  name: 'AuthFormStateProvider',
  props: {
    children: null,
    storage: null,
    storageKey: String,
    initialFields: null,
  },
  setup(props, { slots }) {
    const state = useAuthFormState({
      storage: props.storage,
      storageKey: props.storageKey,
      initialFields: props.initialFields,
    })
    provide(AuthFormStateKey, state)
    return () => (slots.default ? slots.default() : [])
  },
})

/**
 * Reads the shared auth form state from the nearest
 * {@link AuthFormStateProvider} (which `<AuthShell>` renders by default).
 *
 * @returns The shared {@link AuthFormState}.
 * @throws {Error} If called outside an `<AuthFormStateProvider>`/`<AuthShell>`.
 */
export function useAuthFormStateContext(): AuthFormState {
  const state = inject(AuthFormStateKey, undefined)
  if (!state) {
    throw new Error(
      'useAuthFormStateContext must be used within an <AuthFormStateProvider> (or <AuthShell>, which renders one).',
    )
  }
  return state
}
