// @vitest-environment jsdom

/**
 * `useAIModels` — the Solid counterpart of React's
 * `hooks/__tests__/useAIModels.test.tsx`: one `GET /ai/models` fetch per scope,
 * cached in a module singleton, with loading, error and the free-tier model
 * reported as accessors.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import type { HttpClient, HttpResponse } from '@molecule/app-http'

import { HttpContext } from '../../context.js'
import { resetAIModelsCache, useAIModels, type UseAIModelsResult } from '../ai-models.js'

const disposers: Array<() => void> = []

/**
 * Wraps a `vi.fn` so a mock property carries its method's real generic
 * signature without a cast.
 *
 * @param mock - The recording mock.
 * @returns The same mock, typed as the interface method it stands in for.
 */
const asMethod = <Method extends (...args: never[]) => unknown>(
  mock: Mock<Method>,
): Mock<Method> & Method =>
  Object.assign(mock, (): never => {
    throw new Error('generic method stand-in — calls are recorded by the vi.fn mock')
  })

/**
 * Builds an `AppModelDefinition` fixture with sensible defaults.
 *
 * @param overrides - Fields to override on the default model.
 * @returns The merged fixture model.
 */
function fixtureModel(overrides: Partial<AppModelDefinition> = {}): AppModelDefinition {
  return {
    id: 'test-model',
    provider: 'anthropic',
    label: 'Test',
    description: 'Test model',
    contextWindow: 100_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
    cacheReadPricePerMTok: 0.1,
    cacheWritePricePerMTok: 1.25,
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

/**
 * Builds an `HttpResponse<T>` fixture.
 *
 * @param data - The response body.
 * @returns The response.
 */
function httpResponse<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '/ai/models' },
  }
}

/**
 * Builds a minimal `HttpClient` whose `get` is the test's stand-in.
 *
 * @param get - The `get` implementation to install.
 * @returns The client.
 */
function makeClient(get: Mock<HttpClient['get']> & HttpClient['get']): HttpClient {
  return {
    baseURL: '',
    defaultHeaders: {},
    get,
    post: asMethod(vi.fn<HttpClient['post']>()),
    put: asMethod(vi.fn<HttpClient['put']>()),
    patch: asMethod(vi.fn<HttpClient['patch']>()),
    delete: asMethod(vi.fn<HttpClient['delete']>()),
    request: asMethod(vi.fn<HttpClient['request']>()),
    addRequestInterceptor: vi.fn(() => () => undefined),
    addResponseInterceptor: vi.fn(() => () => undefined),
    addErrorInterceptor: vi.fn(() => () => undefined),
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => null),
    onAuthError: vi.fn(() => () => undefined),
  }
}

/**
 * Mounts `useAIModels` under an `HttpContext` and captures the result.
 *
 * @param client - The HTTP client to expose through context.
 * @returns The captured result and a function that unmounts it.
 */
function renderAIModels(client: HttpClient): { result: UseAIModelsResult; dispose: () => void } {
  let captured: UseAIModelsResult | undefined

  /**
   * Calls the primitive under the client context and captures it.
   *
   * @returns Nothing rendered.
   */
  function Probe(): null {
    captured = useAIModels()
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <HttpContext.Provider value={client}>
        <Probe />
      </HttpContext.Provider>
    ),
    container,
  )
  let disposed = false
  const cleanup = (): void => {
    if (disposed) return
    disposed = true
    dispose()
    container.remove()
  }
  disposers.push(cleanup)
  if (!captured) throw new Error('useAIModels was not captured')
  return { result: captured, dispose: cleanup }
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Retries an assertion until it passes or the deadline expires.
 *
 * @param assertion - The assertion to retry.
 * @param timeoutMs - How long to keep retrying.
 * @returns A promise resolved once the assertion passes.
 */
async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await settle()
    }
  }
}

beforeEach(() => {
  resetAIModelsCache()
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  resetAIModelsCache()
})

describe('useAIModels', () => {
  it('returns loading=true and empty models on first render', () => {
    const get = asMethod(vi.fn<HttpClient['get']>())
    get.mockResolvedValue(httpResponse({ models: [fixtureModel()] }))
    const { result } = renderAIModels(makeClient(get))

    expect(result.loading()).toBe(true)
    expect(result.models()).toEqual([])
  })

  it('resolves with the fetched models', async () => {
    const models = [fixtureModel({ id: 'a' }), fixtureModel({ id: 'b', freeTier: true })]
    const get = asMethod(vi.fn<HttpClient['get']>())
    get.mockResolvedValue(httpResponse({ models }))
    const { result } = renderAIModels(makeClient(get))

    await waitFor(() => expect(result.loading()).toBe(false))
    expect(result.models()).toEqual(models)
    expect(result.freeTierModel()?.id).toBe('b')
    expect(result.error()).toBeNull()
  })

  it('fetches only once across multiple mounts', async () => {
    const get = asMethod(vi.fn<HttpClient['get']>())
    get.mockResolvedValue(httpResponse({ models: [fixtureModel()] }))
    const client = makeClient(get)

    const first = renderAIModels(client)
    await waitFor(() => expect(first.result.loading()).toBe(false))
    first.dispose()

    const second = renderAIModels(client)
    expect(second.result.loading()).toBe(false)
    expect(second.result.models()).toHaveLength(1)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('surfaces fetch errors', async () => {
    const get = asMethod(vi.fn<HttpClient['get']>())
    get.mockRejectedValue(new Error('boom'))
    const { result } = renderAIModels(makeClient(get))

    await waitFor(() => expect(result.loading()).toBe(false))
    expect(result.error()?.message).toBe('boom')
    expect(result.models()).toEqual([])
  })
})
