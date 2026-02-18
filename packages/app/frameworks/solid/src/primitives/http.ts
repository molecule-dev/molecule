/**
 * Solid.js primitives for HTTP requests.
 *
 * @module
 */

import { type Accessor, createResource, createSignal, type Resource } from 'solid-js'

import type { FullRequestConfig, HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'

import { getHttpClient } from '../context.js'
import type { HttpState } from '../types.js'

/**
 * Create HTTP primitives for making requests.
 *
 * @returns HTTP methods and utilities
 *
 * @example
 * ```tsx
 * import { createHttp } from '`@molecule/app-solid`'
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
