/**
 * `useAuthFormState` — cross-view auth form persistence.
 *
 * Holds the email (and any other shared auth fields) so a value typed on
 * one auth view (Login / Signup / ForgotPassword / ResetPassword) is
 * carried over when the user navigates to another. Backed by the
 * `@molecule/app-storage` `StorageProvider` abstraction (NEVER raw
 * `sessionStorage`/`localStorage`), so persistence survives the
 * unmount/remount that happens when the router swaps one auth view for
 * another within a single SPA session.
 *
 * The state is CLEARED on successful auth (call `clear()` from the
 * success handler) so credentials do not linger.
 *
 * @module
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getLogger } from '@molecule/app-logger'
import { createMemoryStorageProvider, type StorageProvider } from '@molecule/app-storage'

/**
 * Shared auth form field values. `email` is the canonical cross-view
 * field; additional string fields (e.g. a name carried from Signup) may
 * be stored alongside it.
 */
export interface AuthFormFields {
  /** Email address, shared across all auth views. */
  email?: string
  /** Any other shared string field (e.g. `name`). */
  [field: string]: string | undefined
}

/**
 * Options for {@link useAuthFormState}.
 */
export interface UseAuthFormStateOptions {
  /**
   * Storage provider backing persistence. Defaults to a process-shared
   * in-memory provider (per the no-raw-storage rule), which still gives
   * cross-view persistence within a single SPA session. Inject
   * `createSessionStorageProvider()` from
   * `@molecule/app-storage-localstorage` for tab-scoped persistence that
   * also survives a full reload.
   */
  storage?: StorageProvider
  /** Storage key for the persisted fields. Defaults to `molecule.auth.form-state`. */
  storageKey?: string
  /** Seed values used before hydration completes / when storage is empty. */
  initialFields?: AuthFormFields
}

/**
 * The value returned by {@link useAuthFormState} (and provided through
 * the AuthShell form-state context).
 */
export interface AuthFormState {
  /** Current field values (email + any shared fields). */
  fields: AuthFormFields
  /**
   * `true` once the initial read from storage has completed. Useful for
   * deferring autofocus/validation until persisted values are loaded.
   */
  hydrated: boolean
  /** Sets a single field and persists the new state. */
  setField: (name: string, value: string) => void
  /** Merges a patch of fields and persists the new state. */
  setFields: (patch: AuthFormFields) => void
  /**
   * Clears all persisted auth form state and removes the storage key.
   * Call this from the successful-auth handler.
   */
  clear: () => void
}

/** Default storage key for persisted auth form fields. */
export const DEFAULT_AUTH_FORM_STATE_KEY = 'molecule.auth.form-state'

/**
 * Process-shared in-memory provider used as the default backing store.
 * Shared (not per-call) so the email survives the unmount/remount of an
 * auth view within one SPA session even without an injected provider.
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
 * React hook holding email + shared auth fields, persisted across auth
 * views via an injectable `StorageProvider` and cleared on successful
 * auth.
 *
 * @param options - Optional storage provider, storage key, and seed fields.
 * @returns The current fields plus `setField`/`setFields`/`clear` and a `hydrated` flag.
 */
export function useAuthFormState(options?: UseAuthFormStateOptions): AuthFormState {
  const logger = useMemo(() => getLogger('auth-form-state'), [])
  const storage = useMemo(() => options?.storage ?? getDefaultStorage(), [options?.storage])
  const storageKey = options?.storageKey ?? DEFAULT_AUTH_FORM_STATE_KEY

  const [fields, setFieldsState] = useState<AuthFormFields>(() => ({
    ...(options?.initialFields ?? {}),
  }))
  const [hydrated, setHydrated] = useState(false)

  // Mirror the latest fields in a ref so setters can compute the next
  // value synchronously (handling rapid successive calls in one tick)
  // without an impure functional-updater side effect.
  const fieldsRef = useRef(fields)
  fieldsRef.current = fields

  const persist = useCallback(
    (next: AuthFormFields): void => {
      storage.set(storageKey, next).catch((error) => {
        logger.warn('Failed to persist auth form state', { error, storageKey })
      })
    },
    [logger, storage, storageKey],
  )

  // Hydrate from storage on mount (and when the backing store/key change).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const stored = await storage.get<AuthFormFields>(storageKey)
        if (cancelled) return
        if (stored && typeof stored === 'object') {
          // Values the user already typed (in fieldsRef) win over stored.
          const merged = { ...stored, ...fieldsRef.current }
          fieldsRef.current = merged
          setFieldsState(merged)
        }
      } catch (error) {
        logger.warn('Failed to read persisted auth form state', { error, storageKey })
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [logger, storage, storageKey])

  const setField = useCallback(
    (name: string, value: string): void => {
      const next = { ...fieldsRef.current, [name]: value }
      fieldsRef.current = next
      setFieldsState(next)
      persist(next)
    },
    [persist],
  )

  const setFields = useCallback(
    (patch: AuthFormFields): void => {
      const next = { ...fieldsRef.current, ...patch }
      fieldsRef.current = next
      setFieldsState(next)
      persist(next)
    },
    [persist],
  )

  const clear = useCallback((): void => {
    fieldsRef.current = {}
    setFieldsState({})
    storage.remove(storageKey).catch((error) => {
      logger.warn('Failed to clear persisted auth form state', { error, storageKey })
    })
  }, [logger, storage, storageKey])

  return { fields, hydrated, setField, setFields, clear }
}
