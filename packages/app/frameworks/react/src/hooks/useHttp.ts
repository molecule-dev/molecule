/**
 * React hook for HTTP requests.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useInsertionEffect, useRef, useState } from 'react'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { HttpContext } from '../contexts.js'

/**
 * Hook to access the HTTP client from context.
 *
 * @returns The HTTP client from context
 * @throws {Error} Error if used outside of HttpProvider
 */
export function useHttpClient(): HttpClient {
  const client = useContext(HttpContext)
  if (!client) {
    throw new Error(
      t('react.error.useHttpOutsideProvider', undefined, {
        defaultValue: 'useHttpClient must be used within an HttpProvider',
      }),
    )
  }
  return client
}

/**
 * State for async HTTP operations.
 */
export interface UseHttpState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Result of useHttp hook.
 */
export interface UseHttpResult<T> extends UseHttpState<T> {
  /**
   * Runs the request and resolves with its data, or `null` on failure.
   *
   * This function is IDENTITY-STABLE for as long as `method`, `url` and the HTTP
   * client do not change, so it is safe in a `useEffect` dependency array. Its
   * request options are read when it is CALLED, from the latest committed render.
   */
  execute: () => Promise<T | null>
  reset: () => void
}

/**
 * Options for useHttp hook.
 *
 * Every request option — headers, params, body `data`, `signal`, `onSuccess`,
 * `onError` — is read at the moment `execute` runs, not when the hook rendered,
 * so an inline object or callback needs no memoizing. Only `immediate` is read
 * on mount.
 */
export interface UseHttpOptions<T> extends RequestConfig {
  /**
   * Whether to execute the request immediately on mount.
   */
  immediate?: boolean
  /**
   * Callback when request succeeds.
   */
  onSuccess?: (data: T) => void
  /**
   * Callback when request fails.
   */
  onError?: (error: Error) => void
}

/**
 * Hook for making HTTP requests with state management.
 *
 * `execute` keeps one identity while `method`, `url` and the HTTP client stay the
 * same — across the hook's own loading/data updates, parent rerenders, and inline
 * options or callbacks — so `useEffect(() => { void execute() }, [execute])`
 * runs once per request target instead of looping. The current headers, body,
 * `signal` and callbacks are read when `execute` is called, so a later manual
 * call always sends what the latest committed render passed. Changing `method`, `url` or
 * the client does replace `execute` (it selects a different request) and
 * re-runs such an effect.
 *
 * @param method - HTTP method
 * @param url - Request URL
 * @param options - Request options, read at call time
 * @returns Request state and execute function
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useHttp<User[]>('GET', '/api/users')
 *
 * useEffect(() => {
 *   void execute()
 * }, [execute])
 *
 * if (loading) return <Spinner />
 * if (error) return <Error message={error.message} />
 * return <UserList users={data} />
 * ```
 */
export function useHttp<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options?: UseHttpOptions<T>,
): UseHttpResult<T> {
  const client = useHttpClient()
  const immediate = options?.immediate ?? false

  const [state, setState] = useState<UseHttpState<T>>(() => ({
    data: null,
    loading: immediate,
    error: null,
  }))

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Publish options during commit, before consumers' layout effects. A render
  // that suspends or is discarded must not change a mounted action's request.
  // This only updates our own ref: no DOM access or state update is involved.
  const optionsRef = useRef(options)
  useInsertionEffect(() => {
    optionsRef.current = options
  }, [options])

  const execute = useCallback(async (): Promise<T | null> => {
    if (!mountedRef.current) return null

    // Deliberately NOT a dependency of this callback: options describe the
    // request being sent, while method/url/client decide WHICH request execute
    // performs. Reading them here keeps this action stable for effect deps.
    const { immediate: _immediate, onSuccess, onError, ...requestConfig } = optionsRef.current ?? {}

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      let response: HttpResponse<T>

      switch (method) {
        case 'GET':
          response = await client.get<T>(url, requestConfig)
          break
        case 'POST':
          response = await client.post<T>(url, requestConfig.data, requestConfig)
          break
        case 'PUT':
          response = await client.put<T>(url, requestConfig.data, requestConfig)
          break
        case 'PATCH':
          response = await client.patch<T>(url, requestConfig.data, requestConfig)
          break
        case 'DELETE':
          response = await client.delete<T>(url, requestConfig)
          break
        default:
          throw new Error(
            t(
              'react.error.unsupportedMethod',
              { method },
              { defaultValue: `Unsupported method: ${method}` },
            ),
          )
      }

      if (mountedRef.current) {
        setState({ data: response.data, loading: false, error: null })
        onSuccess?.(response.data)
      }

      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: err })
        onError?.(err)
      }
      return null
    }
  }, [client, method, url])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  // Execute immediately if requested — mount only, as it has always been.
  // `immediate` and `execute` are deliberately not dependencies: re-running this
  // would turn a state update into a second request, which is the historical
  // contract of this option (and every useGet(url, { immediate: true })'s).
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

/**
 * Hook for GET requests.
 * @param url - Request URL to fetch from.
 * @param options - HTTP request options including callbacks and request config.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useGet<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * Hook for POST requests.
 * @param url - Request URL to post to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePost<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * Hook for PUT requests.
 * @param url - Request URL to send the PUT request to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePut<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * Hook for PATCH requests.
 * @param url - Request URL to send the PATCH request to.
 * @param options - HTTP request options including partial body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePatch<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * Hook for DELETE requests.
 * @param url - Request URL of the resource to delete.
 * @param options - HTTP request options including callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useDelete<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('DELETE', url, options)
}
