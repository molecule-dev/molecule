// @vitest-environment jsdom

/**
 * `ScriptsCard` is mounted with one `projectId` and can be re-pointed at another
 * without a remount (the IDE reuses the card).
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ScriptsCard.project-switch.test.tsx`
 * with the same test name and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * The card resets to its loading state in the render that carries the new
 * project id, so the previous project's scripts are never painted under the new
 * one — these tests pin that reset and the reload that follows it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import ScriptsCardProjectHost from './ScriptsCardProjectHost.svelte'

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
 *
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

/** Tears down the mount alive right now, if any. */
let teardown: (() => Promise<void>) | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the card at a project.
 *
 * @param projectId - The project whose scripts are listed.
 * @returns The container and a project replacer.
 */
function render(projectId: string): {
  container: HTMLElement
  setProject: (next: string) => void
} {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  const mounted = mount(ScriptsCardProjectHost, {
    target: container,
    props: {
      http: buildHttpClient(),
      initial: { projectId, initialQuery: '', isLight: true },
    },
  })
  teardown = () => unmount(mounted)
  flushSync()
  const host = container
  return {
    container: host,
    setProject: (next: string): void => {
      mounted.setProps({ projectId: next, initialQuery: '', isLight: true })
      flushSync()
    },
  }
}

describe('ScriptsCard project switch', () => {
  it('drops the previous project’s rows and reloads when the project id changes', async () => {
    const { container: host, setProject } = render('p1')
    await vi.waitFor(() =>
      expect(host.querySelector('[data-mol-id="script-row-p1-only"]')).not.toBeNull(),
    )

    setProject('p2')

    // The render that carries the new project id already shows the loading
    // state: p1's row is gone, not painted one frame under p2.
    expect(host.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
    expect(host.textContent).toContain('Loading scripts')

    await vi.waitFor(() =>
      expect(host.querySelector('[data-mol-id="script-row-p2-only"]')).not.toBeNull(),
    )
    expect(host.querySelector('[data-mol-id="script-row-p1-only"]')).toBeNull()
  })
})
