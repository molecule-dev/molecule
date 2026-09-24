/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real fetch-backed HTTP client.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient, getClient, setClient } from '@molecule/app-http'

import type { AppModelDefinition } from '../index.js'
import {
  formatTokenCount,
  loadAIModels,
  partitionByDeprecation,
  pickFreeTierModel,
} from '../index.js'

/**
 * Builds a catalog entry with the required fields filled in.
 *
 * @param overrides - Fields that differ per model.
 * @returns A complete model definition.
 */
function model(overrides: Partial<AppModelDefinition> & { id: string }): AppModelDefinition {
  return {
    provider: 'anthropic',
    label: overrides.id,
    description: '',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    ...overrides,
  }
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the catalog through the bonded client and derives the picker entries', async () => {
    const catalog = [
      model({ id: 'haiku', label: 'Haiku', freeTier: true }),
      model({ id: 'sonnet', label: 'Sonnet' }),
      model({ id: 'old', label: 'Old', deprecatedAt: '2020-01-01' }),
      model({ id: 'gone', label: 'Gone', disabled: true }),
    ]
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ models: catalog }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setClient(createFetchClient({ baseURL: 'https://api.example.com' }))
    const sessionToken = 'user-session-jwt'
    getClient().setAuthToken(sessionToken)

    const models = await loadAIModels(getClient())
    const { current, deprecated } = partitionByDeprecation(models)
    const selected = pickFreeTierModel(models) ?? current[0]
    const options = current.map((m) => `${m.label} · ${formatTokenCount(m.contextWindow)}`)

    expect(selected?.id).toBe('haiku')
    expect(options).toEqual(['Haiku · 200K', 'Sonnet · 200K'])
    expect(deprecated.map((m) => m.id)).toEqual(['old'])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/ai/models')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer user-session-jwt')
  })
})
