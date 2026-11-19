// @vitest-environment jsdom
/**
 * `useAIModels` lazily fetches the catalog once, caches it across mounts, and
 * surfaces a fetch failure — the contract React's hook pins.
 *
 * The React cases render under an `HttpContext` provider; a Vue composable is
 * injected through `moleculePlugin`, and the HTTP client is a real
 * `createFetchClient()` whose `fetch` the test answers.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import { createFetchClient, type HttpClient } from '@molecule/app-http'

import { moleculePlugin } from '../../plugin.js'
import { resetAIModelsCache, useAIModels, type UseAIModelsResult } from '../useAIModels.js'

const wrappers: VueWrapper[] = []

beforeEach(() => {
  resetAIModelsCache()
})

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  resetAIModelsCache()
  vi.unstubAllGlobals()
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
 * Builds a real `HttpClient` whose `GET /ai/models` answers with the models,
 * plus the `fetch` spy for inspecting calls.
 *
 * @param models - Models to return as the response body of `/ai/models`.
 * @returns The client and the fetch spy.
 */
function makeClient(models: AppModelDefinition[]): {
  client: HttpClient
  fetchMock: Mock<typeof fetch>
} {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify({ models }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return { client: createFetchClient(), fetchMock }
}

/**
 * Runs `useAIModels` inside a mounted component under an HTTP provider.
 *
 * @param client - The HTTP client the plugin injects.
 * @returns The composable result.
 */
function runAIModels(client: HttpClient): UseAIModelsResult {
  let captured: UseAIModelsResult | null = null
  const Probe = defineComponent({
    setup() {
      captured = useAIModels()
      return () => h('div')
    },
  })
  const wrapper = mount(Probe, {
    global: { plugins: [[moleculePlugin, { http: client }]] },
  })
  wrappers.push(wrapper)
  if (!captured) throw new Error('useAIModels setup did not run')
  return captured
}

describe('useAIModels', () => {
  it('returns loading=true and empty models on first render', () => {
    const { client } = makeClient([fixtureModel()])
    const result = runAIModels(client)
    expect(result.loading.value).toBe(true)
    expect(result.models.value).toEqual([])
  })

  it('resolves with the fetched models', async () => {
    const models = [fixtureModel({ id: 'a' }), fixtureModel({ id: 'b', freeTier: true })]
    const { client } = makeClient(models)
    const result = runAIModels(client)

    await vi.waitFor(() => expect(result.loading.value).toBe(false))
    expect(result.models.value).toEqual(models)
    expect(result.freeTierModel.value?.id).toBe('b')
    expect(result.error.value).toBeNull()
  })

  it('fetches only once across multiple mounts', async () => {
    const { client, fetchMock } = makeClient([fixtureModel()])
    const first = runAIModels(client)
    await vi.waitFor(() => expect(first.loading.value).toBe(false))
    wrappers.pop()?.unmount()
    const second = runAIModels(client)
    expect(second.loading.value).toBe(false)
    expect(second.models.value).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces fetch errors', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.reject(new Error('boom')))
    vi.stubGlobal('fetch', fetchMock)
    const result = runAIModels(createFetchClient())

    await vi.waitFor(() => expect(result.loading.value).toBe(false))
    expect(result.error.value?.message).toBe('boom')
    expect(result.models.value).toEqual([])
  })
})
