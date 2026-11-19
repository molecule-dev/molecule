// @vitest-environment jsdom

/**
 * `useAIModels` in Svelte's idiom: called during init under
 * `setMoleculeContext({ http })`, the catalog, the free-tier model, the
 * loading flag and the error are readable stores over the module-level cache
 * React's hook reads through its own cache.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { createFetchClient } from '@molecule/app-http'

import { setMoleculeContext } from '../context.js'
import { resetAIModelsCache, useAIModels, type UseAIModelsResult } from '../hooks/useAIModels.js'

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

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

/**
 * Mounts a host that runs `useAIModels` during a child's init under a real
 * fetch client, where the catalog request goes over a stubbed `fetch`.
 *
 * @returns The hook's result and the host's unmount.
 */
function mountAIModels(): { result: UseAIModelsResult; stop: () => Promise<void> } {
  const captured: { result?: UseAIModelsResult } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: { http: createFetchClient({ baseURL: '' }) },
      setMoleculeContext,
      run: () => {
        captured.result = useAIModels()
      },
    },
  })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  if (captured.result === undefined) throw new Error('the host never ran the hook')
  return { result: captured.result, stop }
}

beforeEach(() => {
  resetAIModelsCache()
})
afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  resetAIModelsCache()
  vi.unstubAllGlobals()
})

describe('useAIModels', () => {
  it('returns loading=true and empty models on first render', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined)),
    )
    const { result } = mountAIModels()
    expect(get(result.loading)).toBe(true)
    expect(get(result.models)).toEqual([])
  })

  it('resolves with the fetched models', async () => {
    const models = [fixtureModel({ id: 'a' }), fixtureModel({ id: 'b', freeTier: true })]

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => Response.json({ models })),
    )
    const { result } = mountAIModels()

    await vi.waitFor(() => expect(get(result.loading)).toBe(false))
    expect(get(result.models)).toEqual(models)
    expect(get(result.freeTierModel)?.id).toBe('b')
    expect(get(result.error)).toBeNull()
  })

  it('fetches only once across multiple mounts', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ models: [fixtureModel()] }))
    vi.stubGlobal('fetch', fetchMock)
    const first = mountAIModels()
    await vi.waitFor(() => expect(get(first.result.loading)).toBe(false))
    await first.stop()
    const second = mountAIModels()
    expect(get(second.result.loading)).toBe(false)
    expect(get(second.result.models)).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces fetch errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => {
        throw new Error('boom')
      }),
    )
    const { result } = mountAIModels()

    await vi.waitFor(() => expect(get(result.loading)).toBe(false))
    expect(get(result.error)?.message).toBe('boom')
    expect(get(result.models)).toEqual([])
  })
})
