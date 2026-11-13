/**
 * Solid.js primitives for HTTP requests.
 *
 * @module
 */

import {
  type Accessor,
  createResource,
  createSignal,
  onCleanup,
  type Resource,
  useContext,
} from 'solid-js'

import type { FullRequestConfig, HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { getHttpClient, HttpContext } from '../context.js'
import type { HttpState } from '../types.js'

/**
 * The HTTP client from the nearest `MoleculeProvider` (`config.http`), under
 * React's hook name.
 *
 * @returns The HTTP client from context.
 * @throws {Error} When no `MoleculeProvider` above configures `http`.
 */
export function useHttpClient(): HttpClient {
  const client = useContext(HttpContext)
  if (!client) {
    throw new Error(
      t('solid.error.useHttpOutsideProvider', undefined, {
        defaultValue: 'useHttpClient must be used within an HttpProvider',
      }),
    )
  }
  return client
}

/**
 * State for async HTTP operations (the fields {@link useHttp} adds its
 * controls to).
 *
 * @template T - The response data type.
 */
export interface UseHttpState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * What {@link useHttp} returns: the request state as accessors and the
 * controls as plain functions.
 *
 * @template T - The response data type.
 */
export interface UseHttpResult<T> {
  /**
   * Runs the request and resolves with its own data, or `null` on failure,
   * even when a newer request or `reset` has superseded its displayed state.
   *
   * This function is IDENTITY-STABLE for as long as `method`, `url` and the
   * HTTP client do not change. Its request options are read when it is
   * CALLED, from the latest committed render.
   */
  /** The response data as an accessor; null until a request answers. */
  data: Accessor<T | null>
  /** Whether a request is in flight, as an accessor. */
  loading: Accessor<boolean>
  /** The request failure as an accessor. */
  error: Accessor<Error | null>
  execute: () => Promise<T | null>
  reset: () => void
}

/**
 * Options for {@link useHttp}.
 *
 * Every request option — headers, params, body `data`, `signal`, `onSuccess`,
 * `onError` — is read at the moment `execute` runs, not when the hook ran, so
 * an inline object or callback needs no memoizing. Only `immediate` is read
 * on mount.
 *
 * @template T - The response data type.
 */
export interface UseHttpOptions<T> extends RequestConfig {
  /** Whether to execute the request immediately on mount. */
  immediate?: boolean
  /**
   * Callback for each request that succeeds while mounted, including a request
   * superseded by another `execute` or `reset`. Read `data` from the hook when
   * only the newest request's result should drive the UI.
   */
  onSuccess?: (data: T) => void
  /** Callback for each request that fails while mounted. */
  onError?: (error: Error) => void
}

/**
 * The replaced host's leftover, one microtask long: a mount in the same turn
 * adopts it (React re-rendered the host, it did not unmount), so the previous
 * host's request callbacks stay armed and its mount-time `immediate` fetch
 * does not repeat.
 */
interface HostHandoff {
  /** Whether the mount-time `immediate` fetch already ran. */
  ranImmediate: boolean
  /** Set by the adopting mount; the disposal microtask then disarms. */
  adopted: boolean
  /** The request counter, shared across an adopting mount. */
  latestRequest: number
  /** The mirrored state, adopted as the next mount's initial state. */
  data: unknown
  loading: boolean
  error: Error | null
}
let hostHandoff: HostHandoff | null = null

/**
 * HTTP requests with state management, under React's hook name.
 *
 * `execute` keeps one identity while `method`, `url` and the HTTP client stay
 * the same. The current headers, body, `signal` and callbacks are read when
 * `execute` is called. The newest request owns the state: an older request
 * that answers after a newer one (or after `reset`) cannot overwrite it, and
 * its callbacks still report to the caller.
 *
 * @param method - HTTP method.
 * @param url - Request URL.
 * @param options - Request options, read at call time.
 * @returns Request state (data, loading, error) as accessors and execute/reset.
 * @throws {Error} When no `MoleculeProvider` above configures `http`.
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useHttp<User[]>('GET', '/api/users')
 * <Show when={!loading()} fallback={<Spinner />}>{/* users *}</Show>
 * ```
 */
export function useHttp<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options?: UseHttpOptions<T>,
): UseHttpResult<T> {
  const client = useHttpClient()
  const immediate = options?.immediate ?? false

  // A mount in the same turn as the previous host's cleanup is React's
  // re-render (the adapter's args step), not a new component: adopt its
  // handoff so the state carries over, `immediate` ran once, the request
  // numbering continues, and the pending request's callbacks stay armed. A
  // mount after a settled disposal is a fresh component.
  const adopted = hostHandoff
  if (adopted) {
    adopted.adopted = true
    hostHandoff = null
  }

  const handoff: HostHandoff = {
    ranImmediate: immediate,
    adopted: false,
    latestRequest: adopted ? adopted.latestRequest : 0,
    data: adopted ? adopted.data : null,
    loading: adopted ? adopted.loading : immediate,
    error: adopted ? adopted.error : null,
  }

  const [data, setData] = createSignal<T | null>(handoff.data as T | null)
  const [loading, setLoading] = createSignal<boolean>(handoff.loading)
  const [error, setError] = createSignal<Error | null>(handoff.error)

  /** Mirrors the signals into the handoff, so an adopting mount reads them. */
  const publish = (): void => {
    handoff.data = data()
    handoff.loading = loading()
    handoff.error = error()
  }

  let disposed = false
  onCleanup(() => {
    publish()
    hostHandoff = handoff
    queueMicrotask(() => {
      if (!handoff.adopted) {
        disposed = true
        if (hostHandoff === handoff) hostHandoff = null
      }
    })
  })

  // The newest request owns the state, across an adopting mount too. Without
  // this, an older request that answers after a newer one overwrote the newer
  // data and cleared `loading` while the newer request was still in flight.
  // `reset` takes ownership too.

  const execute = async (): Promise<T | null> => {
    if (disposed) return null

    // Deliberately not a dependency: options describe the request being sent,
    // while method/url/client decide WHICH request execute performs.
    const { immediate: _immediate, onSuccess, onError, ...requestConfig } = options ?? {}
    const request = ++handoff.latestRequest
    // Callbacks report THIS request's outcome; only the newest request may
    // change what the hook shows.
    const ownsState = (): boolean => !disposed && request === handoff.latestRequest

    setLoading(true)
    setError(null)

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
          // The body travels in the config, like React's DELETE does.
          response = await client.delete<T>(url, requestConfig)
          break
        default:
          throw new Error(
            t(
              'solid.error.unsupportedMethod',
              { method },
              { defaultValue: 'Unsupported method: {{method}}' },
            ),
          )
      }

      if (!disposed) {
        if (ownsState()) {
          setData(() => response.data)
          setLoading(false)
          setError(null)
          publish()
        }
        onSuccess?.(response.data)
      }

      return response.data
    } catch (caught) {
      const err = caught instanceof Error ? caught : new Error(String(caught))
      if (!disposed) {
        if (ownsState()) {
          setData(() => null)
          setLoading(false)
          setError(err)
          publish()
        }
        onError?.(err)
      }
      return null
    }
  }

  const reset = (): void => {
    handoff.latestRequest++
    if (disposed) return
    setData(() => null)
    setLoading(false)
    setError(null)
    publish()
  }

  // Execute immediately if requested — mount only, once per component.
  if (immediate && !(adopted?.ranImmediate ?? false)) {
    void execute()
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
  }
}

/**
 * GET requests, under React's hook name.
 *
 * @param url - Request URL to fetch from.
 * @param options - HTTP request options including callbacks and request config.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useGet<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * POST requests, under React's hook name.
 *
 * @param url - Request URL to post to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePost<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * PUT requests, under React's hook name.
 *
 * @param url - Request URL to send the PUT request to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePut<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * PATCH requests, under React's hook name.
 *
 * @param url - Request URL to send the PATCH request to.
 * @param options - HTTP request options including partial body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePatch<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * DELETE requests, under React's hook name; a body travels in `options.data`.
 *
 * @param url - Request URL of the resource to delete.
 * @param options - HTTP request options including callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useDelete<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('DELETE', url, options)
}

/**
 * Create HTTP primitives for making requests.
 *
 * @returns HTTP methods and utilities
 *
 * @example
 * ```tsx
 * import { createHttp } from '@molecule/app-solid'
 *
 * function UserList() {
 *   const { get } = createHttp()
 *   const [users] = createResource(() => get<User[]>('/api/users'))
 *
 *   return (
 *     <Show when={!users.loading} fallback={<Spinner />}>
 *       <For each={users()}>
 *         {(user) => <UserCard user={user} />}
 *       </For>
 *     </Show>
 *   )
 * }
 * ```
 */

/**
 * Creates a http.
 * @returns The created result.
 */
export function createHttp(): {
  get: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>
  post: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  put: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  patch: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  delete: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>
  request: <T>(config: FullRequestConfig) => Promise<HttpResponse<T>>
} {
  const client = getHttpClient()

  return {
    get: <T>(url: string, config?: RequestConfig) => client.get<T>(url, config),
    post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.post<T>(url, data, config),
    put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.put<T>(url, data, config),
    patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.patch<T>(url, data, config),
    delete: <T>(url: string, config?: RequestConfig) => client.delete<T>(url, config),
    request: <T>(config: FullRequestConfig) => client.request<T>(config),
  }
}

/**
 * Create a resource for fetching data.
 *
 * @param url - URL string or accessor returning a URL string.
 * @param config - Optional request configuration.
 * @returns Solid resource
 *
 * @example
 * ```tsx
 * function UserProfile(props: { userId: string }) {
 *   const user = useFetch<User>(() => `/api/users/${props.userId}`)
 *
 *   return (
 *     <Show when={!user.loading} fallback={<Loading />}>
 *       <h1>{user()?.name}</h1>
 *     </Show>
 *   )
 * }
 * ```
 */
export function useFetch<T>(
  url: Accessor<string> | string,
  config?: RequestConfig,
): Resource<T | undefined> {
  const client = getHttpClient()
  const getUrl = typeof url === 'function' ? url : () => url

  const [data] = createResource(getUrl, async (resolvedUrl) => {
    const response = await client.get<T>(resolvedUrl, config)
    return response.data
  })

  return data
}

/**
 * Create a mutation function.
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * function CreateUserForm() {
 *   const { mutate, isLoading, error } = useMutation<User>()
 *
 *   const handleSubmit = async (data: CreateUserData) => {
 *     const user = await mutate('/api/users', data)
 *     console.log('Created:', user)
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <Show when={error()}>
 *         <ErrorMessage error={error()} />
 *       </Show>
 *       <button type="submit" disabled={isLoading()}>
 *         Create
 *       </button>
 *     </form>
 *   )
 * }
 * ```
 */

/**
 * Hook for mutation.
 * @returns The result.
 */
export function useMutation<T>(): {
  mutate: (
    url: string,
    payload?: unknown,
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  ) => Promise<T>
  isLoading: Accessor<boolean>
  error: Accessor<Error | null>
  data: Accessor<T | null>
  reset: () => void
} {
  const client = getHttpClient()
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal<Error | null>(null)
  const [data, setData] = createSignal<T | null>(null)

  const mutate = async (
    url: string,
    payload?: unknown,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  ): Promise<T> => {
    setIsLoading(true)
    setError(null)

    try {
      let response: HttpResponse<T>

      switch (method) {
        case 'POST':
          response = await client.post<T>(url, payload)
          break
        case 'PUT':
          response = await client.put<T>(url, payload)
          break
        case 'PATCH':
          response = await client.patch<T>(url, payload)
          break
        case 'DELETE':
          response = await client.delete<T>(url)
          break
      }

      setData(() => response.data)
      return response.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    mutate,
    isLoading,
    error,
    data,
    reset: () => {
      setIsLoading(false)
      setError(null)
      setData(null)
    },
  }
}

/**
 * Create a lazy query that only executes when called.
 *
 * @returns Query function and state
 *
 * @example
 * ```tsx
 * function SearchResults() {
 *   const { execute, data, isLoading } = useLazyQuery<SearchResult[]>()
 *
 *   const handleSearch = (query: string) => {
 *     execute(`/api/search?q=${encodeURIComponent(query)}`)
 *   }
 *
 *   return (
 *     <div>
 *       <SearchInput onSearch={handleSearch} />
 *       <Show when={!isLoading()} fallback={<Loading />}>
 *         <ResultsList results={data() ?? []} />
 *       </Show>
 *     </div>
 *   )
 * }
 * ```
 */

/**
 * Hook for lazy query.
 * @returns The result.
 */
export function useLazyQuery<T>(): {
  execute: (url: string, config?: RequestConfig) => Promise<T>
  data: () => T | null
  isLoading: () => boolean
  error: () => Error | null
  reset: () => void
} {
  const client = getHttpClient()
  const [state, setState] = createSignal<HttpState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = async (url: string, config?: RequestConfig): Promise<T> => {
    setState({ data: null, loading: true, error: null })

    try {
      const response = await client.get<T>(url, config)
      setState({ data: response.data, loading: false, error: null })
      return response.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState({ data: null, loading: false, error })
      throw error
    }
  }

  return {
    execute,
    data: () => state().data,
    isLoading: () => state().loading,
    error: () => state().error,
    reset: () => setState({ data: null, loading: false, error: null }),
  }
}

/**
 * Create HTTP helpers from context.
 *
 * @returns HTTP helper functions
 */

/**
 * Creates a http helpers.
 * @returns The created result.
 */
export function createHttpHelpers(): {
  get: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>
  post: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  put: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  patch: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  delete: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>
  setAuthToken: (token: string | null) => void
  getAuthToken: () => string | null
} {
  const client = getHttpClient()

  return {
    get: <T>(url: string, config?: RequestConfig) => client.get<T>(url, config),
    post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.post<T>(url, data, config),
    put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.put<T>(url, data, config),
    patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.patch<T>(url, data, config),
    delete: <T>(url: string, config?: RequestConfig) => client.delete<T>(url, config),
    setAuthToken: (token: string | null) => client.setAuthToken(token),
    getAuthToken: () => client.getAuthToken(),
  }
}

/**
 * Create HTTP primitives from a specific client.
 *
 * @param client - HTTP client
 * @returns HTTP methods
 */

/**
 * Creates a http from client.
 * @param client - The client instance.
 * @returns The created result.
 */
export function createHttpFromClient(client: HttpClient): {
  get: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>
  post: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  put: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  patch: <T>(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<T>>
  delete: <T>(url: string, config?: RequestConfig) => Promise<HttpResponse<T>>
  request: <T>(config: FullRequestConfig) => Promise<HttpResponse<T>>
} {
  return {
    get: <T>(url: string, config?: RequestConfig) => client.get<T>(url, config),
    post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.post<T>(url, data, config),
    put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.put<T>(url, data, config),
    patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
      client.patch<T>(url, data, config),
    delete: <T>(url: string, config?: RequestConfig) => client.delete<T>(url, config),
    request: <T>(config: FullRequestConfig) => client.request<T>(config),
  }
}
