// @vitest-environment jsdom
/**
 * `ScriptsCard` is mounted with one `projectId` and can be re-pointed at another
 * without a remount (the IDE reuses the card) — a port of
 * `@molecule/app-ide-react/src/__tests__/ScriptsCard.project-switch.test.tsx`
 * with the same test name and the same assertions, mounted as a real Solid
 * root under an http context (the card fetches its own listing).
 *
 * The card resets to its loading state in the render that carries the new
 * project id, so the previous project's scripts are never painted under the new
 * one.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'
import { HttpContext } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ScriptsCard } from '../parts/ScriptsCard.jsx'

/** One script per project, so a stale list is unmistakable. */
const SCRIPTS_BY_PROJECT: Record<string, ScriptInfo[]> = {
  p1: [{ name: 'p1-only', description: 'Belongs to p1', createdAt: '' }],
  p2: [{ name: 'p2-only', description: 'Belongs to p2', createdAt: '' }],
}

/**
 * A typed {@link HttpResponse} wrapper for a resolved value.
 * @param data - The response body.
 * @returns The response.
 */
function ok<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/**
 * Serves each project its own single-script list.
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      const match = /\/projects\/([^/]+)\/scripts$/.exec(url)
      if (!match) throw new Error(`unexpected GET ${url}`)
      return ok({ scripts: SCRIPTS_BY_PROJECT[match[1]] ?? [] })
    }) as HttpClient['get'],
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

describe('ScriptsCard project switch', () => {
  it('drops the previous project’s rows and reloads when the project id changes', async () => {
    const [projectId, setProjectId] = createSignal('p1')
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => (
        <HttpContext.Provider value={buildHttpClient()}>
          <ScriptsCard projectId={projectId()} initialQuery="" isLight />
        </HttpContext.Provider>
      ),
      container,
    )
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).not.toBeNull(),
    )

    setProjectId('p2')

    // The render that carries the new project id already shows the loading
    // state: p1's row is gone, not painted one frame under p2.
    expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
    expect(container.textContent).toContain('Loading scripts')

    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="script-row-p2-only"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
  })
})
