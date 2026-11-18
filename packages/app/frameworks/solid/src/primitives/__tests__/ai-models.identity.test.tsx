// @vitest-environment jsdom
/**
 * `useAIModels` reads one empty models list while the catalog loads and after it fails, as React's hook does:
 * every read of the accessor returns the same list until the catalog has one.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient, type HttpClient } from '@molecule/app-http'

import { HttpContext } from '../../context.js'
import { resetAIModelsCache, useAIModels, type UseAIModelsResult } from '../ai-models.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  resetAIModelsCache()
  vi.unstubAllGlobals()
})

/**
 * Mounts `useAIModels` under an `HttpContext` and captures the result.
 *
 * @param client - The HTTP client to expose through context.
 * @returns The captured result.
 */
function renderAIModels(client: HttpClient): UseAIModelsResult {
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
  disposers.push(() => {
    dispose()
    container.remove()
  })
  if (!captured) throw new Error('useAIModels was not captured')
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
    const result = renderAIModels(createFetchClient())
    const first = result.models()
    expect(result.models()).toBe(first)

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fail(new Error('boom'))
    await vi.waitFor(() => expect(result.loading()).toBe(false))
    expect(result.models()).toBe(first)
  })
})
