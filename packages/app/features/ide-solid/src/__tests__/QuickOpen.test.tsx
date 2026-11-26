// @vitest-environment jsdom
/**
 * `QuickOpen` fetches the project's file list and hands it to `QuickPicker` — a
 * port of `@molecule/app-ide-react/src/__tests__/QuickOpen.test.tsx` with the
 * same test name and the same assertions, mounted as a real Solid root.
 *
 * It can be re-pointed at another project without a remount, and the picker must
 * show its loading state — not the previous project's files — in the render that
 * carries the new project id.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { QuickOpen } from '../components/QuickOpen.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** One file per project, so a stale list is unmistakable. */
const FILES_BY_PROJECT: Record<string, string[]> = {
  p1: ['/workspace/p1.ts'],
  p2: ['/workspace/p2.ts'],
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
 * Serves each project its own single-file list.
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      const match = /\/projects\/([^/]+)\/files-list$/.exec(url)
      if (!match) throw new Error(`unexpected GET ${url}`)
      return ok({ files: FILES_BY_PROJECT[match[1]] ?? [] })
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

const onFileOpen = vi.fn()
const onDismiss = vi.fn()

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onFileOpen.mockClear()
  onDismiss.mockClear()
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

describe('QuickOpen project switch', () => {
  it('shows loading, not the previous project’s files, when the project id changes', async () => {
    const [projectId, setProjectId] = createSignal('p1')
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => (
        <MoleculeProvider theme={buildThemeProvider()} http={buildHttpClient()}>
          <QuickOpen projectId={projectId()} onFileOpen={onFileOpen} onDismiss={onDismiss} />
        </MoleculeProvider>
      ),
      container,
    )
    await vi.waitFor(() =>
      expect(
        container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
      ).not.toBeNull(),
    )

    setProjectId('p2')

    // The render carrying the new project id is already in the loading state.
    expect(
      container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
    ).toBeNull()
    expect(container.ownerDocument.querySelector('[role="dialog"]')?.textContent).toContain(
      'Loading',
    )

    await vi.waitFor(() =>
      expect(
        container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p2.ts"]'),
      ).not.toBeNull(),
    )
    expect(
      container.ownerDocument.querySelector('[data-mol-id="quick-picker-item-/workspace/p1.ts"]'),
    ).toBeNull()
  })
})
