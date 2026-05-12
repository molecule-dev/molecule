import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { describe, expect, it, vi } from 'vitest'

import { loadAIModels, pickFreeTierModel } from '../load.js'
import type { AppModelDefinition } from '../types.js'

function fakeHttp(models: AppModelDefinition[]): HttpClient {
  const get = vi.fn(async () => {
    const response: HttpResponse<{ models: AppModelDefinition[] }> = {
      data: { models },
      status: 200,
      statusText: 'OK',
      headers: {},
    }
    return response
  })
  // Only the methods loadAIModels touches are filled; the rest are unused stubs.
  return {
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
}

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
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

describe('loadAIModels', () => {
  it('fetches GET /ai/models by default', async () => {
    const http = fakeHttp([])
    await loadAIModels(http)
    expect(http.get).toHaveBeenCalledWith('/ai/models')
  })

  it('uses an override path when provided', async () => {
    const http = fakeHttp([])
    await loadAIModels(http, '/custom/path')
    expect(http.get).toHaveBeenCalledWith('/custom/path')
  })

  it('returns the models array from the response body', async () => {
    const expected = [fixtureModel({ id: 'a' }), fixtureModel({ id: 'b' })]
    const result = await loadAIModels(fakeHttp(expected))
    expect(result).toEqual(expected)
  })
})

describe('pickFreeTierModel', () => {
  it('returns the model marked with freeTier: true', () => {
    const free = fixtureModel({ id: 'free', freeTier: true })
    const models = [fixtureModel({ id: 'paid' }), free, fixtureModel({ id: 'other' })]
    expect(pickFreeTierModel(models)).toBe(free)
  })

  it('returns undefined when no model is marked free-tier', () => {
    expect(pickFreeTierModel([fixtureModel(), fixtureModel({ id: 'x' })])).toBeUndefined()
  })
})
