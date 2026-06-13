/**
 * React context wiring for {@link useAuthFormState}.
 *
 * `<AuthShell>` wraps its content in `<AuthFormStateProvider>` so any
 * auth form rendered inside inherits cross-view email persistence — call
 * `useAuthFormStateContext()` from the form to bind the shared `email`
 * (and other shared fields) and to `clear()` on successful auth. Apps
 * that compose the lower-level AuthShell primitives (instead of the
 * `AuthShell` preset) can wrap manually with `<AuthFormStateProvider>`.
 *
 * @module
 */

import { createContext, type JSX, type ReactNode, useContext } from 'react'

import type { StorageProvider } from '@molecule/app-storage'

import { type AuthFormFields, type AuthFormState, useAuthFormState } from './useAuthFormState.js'

const AuthFormStateContext = createContext<AuthFormState | null>(null)

/**
 * Props for {@link AuthFormStateProvider}.
 */
export interface AuthFormStateProviderProps {
  children: ReactNode
  /** Storage provider backing persistence (defaults to a shared in-memory provider). */
  storage?: StorageProvider
  /** Storage key for the persisted fields. */
  storageKey?: string
  /** Seed values used before hydration / when storage is empty. */
  initialFields?: AuthFormFields
}

/**
 * Provides a single {@link useAuthFormState} instance to all descendants
 * via React context, so sibling/child auth forms share the same email.
 *
 * @param props - Children plus optional storage provider, key, and seed fields.
 * @returns The provider element.
 */
export function AuthFormStateProvider({
  children,
  storage,
  storageKey,
  initialFields,
}: AuthFormStateProviderProps): JSX.Element {
  const state = useAuthFormState({ storage, storageKey, initialFields })
  return <AuthFormStateContext.Provider value={state}>{children}</AuthFormStateContext.Provider>
}

/**
 * Reads the shared auth form state from the nearest
 * {@link AuthFormStateProvider} (which `<AuthShell>` renders by default).
 *
 * @returns The shared {@link AuthFormState}.
 * @throws {Error} If called outside an `<AuthFormStateProvider>`/`<AuthShell>`.
 */
export function useAuthFormStateContext(): AuthFormState {
  const ctx = useContext(AuthFormStateContext)
  if (!ctx) {
    throw new Error(
      'useAuthFormStateContext must be used within an <AuthFormStateProvider> (or <AuthShell>, which renders one).',
    )
  }
  return ctx
}
