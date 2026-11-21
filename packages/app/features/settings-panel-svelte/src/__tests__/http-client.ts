/**
 * A complete, typed `HttpClient` fake for the settings-panel tests.
 *
 * The section components receive an `HttpClient`; these tests need only `get`
 * and `patch`, but the object handed to the binding must satisfy the whole
 * interface — a partial object cast into it hides a missing transport method
 * until a test exercises it. Every other member is stubbed, and the stubs
 * reject loudly so an unexpected call names itself.
 *
 * @module
 */

import { vi } from 'vitest'

import type {
  ErrorInterceptor,
  FullRequestConfig,
  HttpAuthErrorEvent,
  HttpClient,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from '@molecule/app-http'

/** The fake's client and the mocks its `get` and `patch` delegate to. */
export interface FakeHttpClient {
  /** The client to hand to the binding. */
  client: HttpClient
  /** The mock the client's `get` delegates to. */
  get: ReturnType<typeof vi.fn>
  /** The mock the client's `patch` delegates to. */
  patch: ReturnType<typeof vi.fn>
}

/**
 * Builds an `HttpClient` fake whose `get` and `patch` delegate to the returned
 * mocks, and whose other members are typed stubs.
 *
 * @returns The client and the `get`/`patch` mocks it delegates to.
 */
export function fakeHttpClient(): FakeHttpClient {
  const get = vi.fn()
  const patch = vi.fn()
  let authToken: string | null = null
  const authErrorHandlers = new Set<(event: HttpAuthErrorEvent) => void>()
  const noop = (): void => undefined

  const client: HttpClient = {
    baseURL: '/api',
    defaultHeaders: {},
    request: (_config: FullRequestConfig): Promise<never> =>
      Promise.reject(new Error('not stubbed: request')),
    get: (url: string, config?: RequestConfig) => get(url, config),
    post: (_url: string, _data?: unknown, _config?: RequestConfig): Promise<never> =>
      Promise.reject(new Error('not stubbed: post')),
    put: (_url: string, _data?: unknown, _config?: RequestConfig): Promise<never> =>
      Promise.reject(new Error('not stubbed: put')),
    patch: (url: string, data?: unknown, config?: RequestConfig) => patch(url, data, config),
    delete: (_url: string, _config?: RequestConfig): Promise<never> =>
      Promise.reject(new Error('not stubbed: delete')),
    addRequestInterceptor: (_interceptor: RequestInterceptor) => noop,
    addResponseInterceptor: (_interceptor: ResponseInterceptor) => noop,
    addErrorInterceptor: (_interceptor: ErrorInterceptor) => noop,
    setAuthToken: (token: string | null) => {
      authToken = token
    },
    getAuthToken: () => authToken,
    onAuthError: (handler: (event: HttpAuthErrorEvent) => void) => {
      authErrorHandlers.add(handler)
      return () => {
        authErrorHandlers.delete(handler)
      }
    },
  }
  return { client, get, patch }
}
