/**
 * React hook for storage.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useState } from 'react'

import { t } from '@molecule/app-i18n'
import type { StorageProvider } from '@molecule/app-storage'

import { StorageContext } from '../contexts.js'

/**
 * Hook to access the storage provider from context.
 *
 * @returns The storage provider from context
 * @throws {Error} Error if used outside of StorageProvider
 */
export function useStorageProvider(): StorageProvider {
  const provider = useContext(StorageContext)
  if (!provider) {
    throw new Error(
      t('react.error.useStorageOutsideProvider', undefined, {
        defaultValue: 'useStorageProvider must be used within a StorageProvider',
      }),
    )
  }
  return provider
}

/**
 * Options for useStorageValue hook.
 */
export interface UseStorageValueOptions<T> {
  /**
   * Default value if key doesn't exist.
   */
  defaultValue?: T
  /**
   * Whether to sync across tabs/windows (if supported by storage provider).
   */
  sync?: boolean
}

/**
 * Result of useStorageValue hook.
 */
export interface UseStorageValueResult<T> {
  value: T | undefined
  setValue: (value: T) => Promise<void>
  removeValue: () => Promise<void>
  loading: boolean
  error: Error | null
}

/**
 * Hook to manage a single storage value with React state sync.
 *
 * @param key - Storage key
 * @param options - Hook options
 *
 * @example
 * ```tsx
 * const { value: theme, setValue: setTheme, loading } = useStorageValue<string>('theme', {
 *   defaultValue: 'light'
 * })
 *
 * if (loading) return <Spinner />
 * return (
 *   <select value={theme} onChange={(e) => setTheme(e.target.value)}>
 *     <option value="light">Light</option>
 *     <option value="dark">Dark</option>
 *   </select>
 * )
 * ```
 * @returns Storage value state (value, loading, error) and mutators (setValue, removeValue).
 */
export function useStorageValue<T>(
  key: string,
  options?: UseStorageValueOptions<T>,
): UseStorageValueResult<T> {
  const storage = useStorageProvider()
  const { defaultValue, sync = false } = options ?? {}

  const [value, setValueState] = useState<T | undefined>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load initial value
  useEffect(() => {
    let mounted = true

    const loadValue = async (): Promise<void> => {
      try {
        const stored = await storage.get<T>(key)
        if (mounted) {
          setValueState(stored ?? defaultValue)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      }
    }

    loadValue()

    return () => {
      mounted = false
    }
  }, [key, storage, defaultValue])

  // Sync across tabs if supported
  useEffect(() => {
    if (!sync) return

    const handleStorageChange = (event: StorageEvent): void => {
      if (event.key === key && event.newValue !== null) {
        try {
          const newValue = JSON.parse(event.newValue) as T
          setValueState(newValue)
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, sync])

  const setValue = useCallback(
    async (newValue: T) => {
      try {
        await storage.set(key, newValue)
        setValueState(newValue)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        throw err
      }
    },
    [key, storage],
  )

  const removeValue = useCallback(async () => {
    try {
      await storage.remove(key)
      setValueState(defaultValue)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }, [key, storage, defaultValue])

  return {
    value,
    setValue,
    removeValue,
    loading,
    error,
  }
}

/**
 * Hook for simple storage operations without React state sync.
 *
 * @returns Storage operation methods
 */
export function useStorage(): {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  clear: () => Promise<void>
  keys: () => Promise<string[]>
} {
  const storage = useStorageProvider()

  const get = useCallback(<T>(key: string) => storage.get<T>(key), [storage])

  const set = useCallback(<T>(key: string, value: T) => storage.set(key, value), [storage])

  const remove = useCallback((key: string) => storage.remove(key), [storage])

  const clear = useCallback(() => storage.clear(), [storage])

  const keys = useCallback(() => storage.keys(), [storage])

  return {
    get,
    set,
    remove,
    clear,
    keys,
  }
}
