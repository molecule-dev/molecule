// @vitest-environment jsdom
/**
 * `useAIModels` reads one empty models list while the catalog loads and after it fails, as React's hook does, so
 * a subscriber keyed on the list's identity sees no change until the catalog has one.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { createFetchClient } from '@molecule/app-http'

import { setMoleculeContext } from '../context.js'
import { resetAIModelsCache, useAIModels, type UseAIModelsResult } from '../hooks/useAIModels.js'

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  resetAIModelsCache()
  vi.unstubAllGlobals()
})

/**
 * Mounts a host that runs `useAIModels` during a child's init under a real fetch client.
 *
 * @returns The hook's result.
 */
function mountAIModels(): UseAIModelsResult {
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
  hosts.push(async () => {
    await unmount(app)
    container.remove()
  })
  if (captured.result === undefined) throw new Error('the host never ran the hook')
  return captured.result
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
    const result = mountAIModels()
    const first = get(result.models)
    expect(get(result.models)).toBe(first)

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fail(new Error('boom'))
    await vi.waitFor(() => expect(get(result.loading)).toBe(false))
    expect(get(result.models)).toBe(first)
  })

  it('gives two callers on one scope the same empty models list while the catalog loads', async () => {
    resetAIModelsCache()
    let fail: (error: Error) => void = () => undefined
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((_resolve, reject) => {
          fail = reject
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const first = mountAIModels()
    const second = mountAIModels()
    expect(get(first.loading)).toBe(true)
    expect(get(second.models)).toBe(get(first.models))

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fail(new Error('boom'))
    await vi.waitFor(() => expect(get(first.loading)).toBe(false))
  })
})
