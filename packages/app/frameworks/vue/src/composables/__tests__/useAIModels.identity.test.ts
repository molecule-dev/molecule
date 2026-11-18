// @vitest-environment jsdom
/**
 * `useAIModels` reads one empty models list while the catalog loads and after it fails, as React's hook does, so
 * a watcher keyed on the list's identity sees no change until the catalog has one.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { createFetchClient } from '@molecule/app-http'

import { moleculePlugin } from '../../plugin.js'
import { resetAIModelsCache, useAIModels, type UseAIModelsResult } from '../useAIModels.js'

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  resetAIModelsCache()
  vi.unstubAllGlobals()
})

/**
 * Runs `useAIModels` inside a mounted component under a real fetch client.
 *
 * @returns The composable result.
 */
function runAIModels(): UseAIModelsResult {
  let captured: UseAIModelsResult | null = null
  const Probe = defineComponent({
    setup() {
      captured = useAIModels()
      return () => h('div')
    },
  })
  wrappers.push(
    mount(Probe, { global: { plugins: [[moleculePlugin, { http: createFetchClient() }]] } }),
  )
  if (!captured) throw new Error('useAIModels setup did not run')
  return captured
}

describe('useAIModels', () => {
  it('keeps one empty models list while the catalog loads and after it fails', async () => {
    resetAIModelsCache()
    let fail: (error: Error) => void = () => undefined
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = runAIModels()
    const first = result.models.value
    expect(result.models.value).toBe(first)

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fail(new Error('boom'))
    await vi.waitFor(() => expect(result.loading.value).toBe(false))
    expect(result.models.value).toBe(first)
  })
})
