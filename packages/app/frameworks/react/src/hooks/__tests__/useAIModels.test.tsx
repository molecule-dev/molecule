// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-core-ai-models'
import type { HttpClient, HttpResponse } from '@molecule/app-http'

import { HttpContext } from '../../contexts.js'
import { resetAIModelsCache, useAIModels } from '../useAIModels.js'

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
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

/**
 * Builds a minimal `HttpClient` that returns the given models from `.get`.
 *
 * @param models - Models to return as the response body of `/ai/models`.
 * @returns The fake client and the spy for inspecting calls.
 */
function makeClient(models: AppModelDefinition[]): {
  client: HttpClient
  get: ReturnType<typeof vi.fn>
} {
  const get = vi.fn(
    async (): Promise<HttpResponse<{ models: AppModelDefinition[] }>> => ({
      data: { models },
      status: 200,
      statusText: 'OK',
      headers: {},
    }),
  )
  const client = {
    baseURL: '',
    defaultHeaders: {},
    get,
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    addRequestInterceptor: vi.fn(() => () => undefined),
    addResponseInterceptor: vi.fn(() => () => undefined),
    addErrorInterceptor: vi.fn(() => () => undefined),
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => null),
    onAuthError: vi.fn(() => () => undefined),
  } as unknown as HttpClient
  return { client, get }
}

/**
 * Builds a `renderHook` wrapper that injects an `HttpClient` via `HttpContext`.
 *
 * @param client - HTTP client to expose through the context.
 * @returns A wrapper component for `renderHook`.
 */
function wrapperFor(client: HttpClient): (props: { children: ReactNode }) => JSX.Element {
  return ({ children }) => <HttpContext.Provider value={client}>{children}</HttpContext.Provider>
}

describe('useAIModels', () => {
  beforeEach(() => {
    resetAIModelsCache()
  })
  afterEach(() => {
    resetAIModelsCache()
  })

  it('returns loading=true and empty models on first render', () => {
    const { client } = makeClient([fixtureModel()])
    const { result } = renderHook(() => useAIModels(), { wrapper: wrapperFor(client) })
    expect(result.current.loading).toBe(true)
    expect(result.current.models).toEqual([])
  })

  it('resolves with the fetched models', async () => {
    const models = [fixtureModel({ id: 'a' }), fixtureModel({ id: 'b', freeTier: true })]
    const { client } = makeClient(models)
    const { result } = renderHook(() => useAIModels(), { wrapper: wrapperFor(client) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.models).toEqual(models)
    expect(result.current.freeTierModel?.id).toBe('b')
    expect(result.current.error).toBeNull()
  })

  it('fetches only once across multiple mounts', async () => {
    const { client, get } = makeClient([fixtureModel()])
    const wrapper = wrapperFor(client)
    const first = renderHook(() => useAIModels(), { wrapper })
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    first.unmount()
    const second = renderHook(() => useAIModels(), { wrapper })
    expect(second.result.current.loading).toBe(false)
    expect(second.result.current.models).toHaveLength(1)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('surfaces fetch errors', async () => {
    const failingClient = {
      ...makeClient([]).client,
      get: vi.fn(async () => {
        throw new Error('boom')
      }),
    } as unknown as HttpClient
    const { result } = renderHook(() => useAIModels(), { wrapper: wrapperFor(failingClient) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toBe('boom')
    expect(result.current.models).toEqual([])
  })
})
