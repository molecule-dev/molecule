// @vitest-environment jsdom

/**
 * `ScriptsCard` is mounted with one `projectId` and can be re-pointed at another
 * without a remount (the IDE reuses the card). The card resets to its loading
 * state in the render that carries the new project id, so the previous
 * project's scripts are never painted under the new one — this test pins that
 * reset and the reload that follows it.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ScriptsCard.project-switch.test.tsx`
 * with the same test name and the same assertions, mounted through Vue's own
 * `createApp` under an http provider (the card fetches its own listing). The
 * stub answers a macrotask later, so the loading render that carries the new
 * project id is observable before its rows arrive.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type VNodeChild } from 'vue'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { HttpKey } from '@molecule/app-vue'

import { ScriptsCard } from '../parts/ScriptsCard.js'

/** One script per project, so a stale list is unmistakable. */
const SCRIPTS_BY_PROJECT: Record<string, ScriptInfo[]> = {
  p1: [{ name: 'p1-only', description: 'Belongs to p1', createdAt: '' }],
  p2: [{ name: 'p2-only', description: 'Belongs to p2', createdAt: '' }],
}

/**
 * A typed {@link HttpResponse} wrapper for a resolved value.
 *
 * @param data - The response body.
 * @returns The response.
 */
function responseOf(data: unknown): HttpResponse<never> {
  // The payload stands in for the server's reply; the client contract is
  // caller-generic, which no concrete payload can prove, so the stub types it
  // never and the interface widens it to the caller's T.
  return {
    data: data as never,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/**
 * Serves each project its own single-script list, one macrotask later.
 *
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: async (url: string): Promise<HttpResponse<never>> => {
      const match = /\/projects\/([^/]+)\/scripts$/.exec(url)
      if (!match) throw new Error(`unexpected GET ${url}`)
      await new Promise((resolve) => setTimeout(resolve, 0))
      return responseOf({ scripts: SCRIPTS_BY_PROJECT[match[1]] ?? [] })
    },
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

/** The app and host this file last mounted, torn down before the next render. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

/**
 * Mounts {@link ScriptsCard} over the stub client, the way the app does.
 *
 * @param projectId - The first project id.
 * @returns The mount host and the reactive props to drive the switch.
 */
function mount(projectId: string): { container: HTMLElement; props: { projectId: string } } {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const props = reactive({ projectId })
  const app = createApp({
    render: (): VNodeChild =>
      h(ScriptsCard, { projectId: props.projectId, initialQuery: '', isLight: true }),
  })
  app.provide(HttpKey, buildHttpClient())
  mounted.app = app
  app.mount(host)
  return { container: host, props }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  mounted.host?.remove()
  mounted.host = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('ScriptsCard project switch', () => {
  it('drops the previous project’s rows and reloads when the project id changes', async () => {
    const { container, props } = mount('p1')
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="script-row-p1-only"]')).not.toBeNull(),
    )

    props.projectId = 'p2'
    await nextTick()

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
