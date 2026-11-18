/**
 * `useAuthFormState` (Angular) — cross-view auth form persistence.
 *
 * Holds the email (and any other shared auth fields) so a value typed on one
 * auth view (Login / Signup / ForgotPassword / ResetPassword) is carried over
 * when the user navigates to another. Backed by the `@molecule/app-storage`
 * `StorageProvider` abstraction (never raw `sessionStorage`/`localStorage`).
 *
 * Call it in an injection context (a component field initializer or
 * constructor). The state is CLEARED on successful auth (call `clear()` from
 * the success handler) so credentials do not linger.
 *
 * @module
 */

import { DestroyRef, inject, signal } from '@angular/core'

import { getLogger } from '@molecule/app-logger'
import { createMemoryStorageProvider, type StorageProvider } from '@molecule/app-storage'

import type { AuthFormFields, AuthFormState, UseAuthFormStateOptions } from './types.js'

/** Default storage key for persisted auth form fields. */
export const DEFAULT_AUTH_FORM_STATE_KEY = 'molecule.auth.form-state'

/**
 * Process-shared in-memory provider used as the default backing store.
 * Shared (not per-call) so the email survives the unmount/remount of an auth
 * view within one SPA session even without an injected provider.
 */
let defaultStorage: StorageProvider | undefined

/**
 * Lazily creates (once) and returns the process-shared in-memory storage
 * provider used as the default backing store.
 *
 * @returns The shared in-memory `StorageProvider`.
 */
const getDefaultStorage = (): StorageProvider => {
  defaultStorage ??= createMemoryStorageProvider()
  return defaultStorage
}

/**
 * Angular hook holding email + shared auth fields, persisted across auth views
 * via an injectable `StorageProvider` and cleared on successful auth.
 *
 * @param options - Optional storage provider, storage key, and seed fields.
 * @returns The current fields plus `setField`/`setFields`/`clear` and a `hydrated` flag.
 */
export function useAuthFormState(options?: UseAuthFormStateOptions): AuthFormState {
  const logger = getLogger('auth-form-state')
  const storage = options?.storage ?? getDefaultStorage()
  const storageKey = options?.storageKey ?? DEFAULT_AUTH_FORM_STATE_KEY

  const fields = signal<AuthFormFields>({ ...(options?.initialFields ?? {}) })
  const hydrated = signal(false)

  // Mirror the latest fields so setters compute the next value synchronously.
  let current: AuthFormFields = fields()

  let cancelled = false
  inject(DestroyRef).onDestroy(() => {
    cancelled = true
  })

  void (async () => {
    try {
      const stored = await storage.get<AuthFormFields>(storageKey)
      if (cancelled) return
      if (stored && typeof stored === 'object') {
        // Values the user already typed win over stored.
        const merged = { ...stored, ...current }
        current = merged
        fields.set(merged)
      }
    } catch (error) {
      logger.warn('Failed to read persisted auth form state', { error, storageKey })
    } finally {
      if (!cancelled) hydrated.set(true)
    }
  })()

  /**
   * Persists the next state, logging (never throwing) on failure.
   *
   * @param next - The next field values.
   */
  const persist = (next: AuthFormFields): void => {
    storage.set(storageKey, next).catch((error) => {
      logger.warn('Failed to persist auth form state', { error, storageKey })
    })
  }

  /**
   * Sets a single field and persists the new state.
   *
   * @param name - The field name.
   * @param value - The new value.
   */
  const setField = (name: string, value: string): void => {
    const next = { ...current, [name]: value }
    current = next
    fields.set(next)
    persist(next)
  }

  /**
   * Merges a patch of fields and persists the new state.
   *
   * @param patch - The fields to merge.
   */
  const setFields = (patch: AuthFormFields): void => {
    const next = { ...current, ...patch }
    current = next
    fields.set(next)
    persist(next)
  }

  /** Clears all persisted auth form state and removes the storage key. */
  const clear = (): void => {
    current = {}
    fields.set({})
    storage.remove(storageKey).catch((error) => {
      logger.warn('Failed to clear persisted auth form state', { error, storageKey })
    })
  }

  return { fields, hydrated, setField, setFields, clear }
}
