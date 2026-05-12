import { describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'

import { isDeprecated, loadAIModels, partitionByDeprecation, pickFreeTierModel } from '../load.js'
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
    outputPricePerMTok: 5,
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

describe('isDeprecated', () => {
  it('is false when deprecatedAt is undefined', () => {
    expect(isDeprecated(fixtureModel(), '2026-06-01')).toBe(false)
  })

  it('is true when deprecatedAt is on or before now', () => {
    expect(isDeprecated(fixtureModel({ deprecatedAt: '2026-05-01' }), '2026-06-01')).toBe(true)
    expect(isDeprecated(fixtureModel({ deprecatedAt: '2026-06-01' }), '2026-06-01')).toBe(true)
  })

  it('is false when deprecatedAt is after now (scheduled future deprecation)', () => {
    expect(isDeprecated(fixtureModel({ deprecatedAt: '2026-12-01' }), '2026-06-01')).toBe(false)
  })
})

describe('partitionByDeprecation', () => {
  it('splits current from deprecated relative to now', () => {
    const a = fixtureModel({ id: 'a' })
    const b = fixtureModel({ id: 'b', deprecatedAt: '2026-05-01' })
    const c = fixtureModel({ id: 'c', deprecatedAt: '2027-01-01' })
    const result = partitionByDeprecation([a, b, c], '2026-06-01')
    expect(result.current.map((m) => m.id)).toEqual(['a', 'c'])
    expect(result.deprecated.map((m) => m.id)).toEqual(['b'])
  })

  it('preserves order within each partition', () => {
    const models = [
      fixtureModel({ id: 'first' }),
      fixtureModel({ id: 'old-1', deprecatedAt: '2026-01-01' }),
      fixtureModel({ id: 'second' }),
      fixtureModel({ id: 'old-2', deprecatedAt: '2026-02-01' }),
    ]
    const result = partitionByDeprecation(models, '2026-06-01')
    expect(result.current.map((m) => m.id)).toEqual(['first', 'second'])
    expect(result.deprecated.map((m) => m.id)).toEqual(['old-1', 'old-2'])
  })

  it('returns all as current when none are deprecated', () => {
    const models = [fixtureModel({ id: 'a' }), fixtureModel({ id: 'b' })]
    const result = partitionByDeprecation(models, '2026-06-01')
    expect(result.current).toHaveLength(2)
    expect(result.deprecated).toHaveLength(0)
  })
})
