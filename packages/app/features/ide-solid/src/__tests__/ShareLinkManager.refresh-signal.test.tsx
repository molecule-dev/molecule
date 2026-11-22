// @vitest-environment jsdom
/**
 * `ShareLinkManager`'s `refreshSignal`: the host bumps it when another member of
 * the project created or revoked the public link, and the open panel must reload
 * the list in place (no remount) so it reflects that change — a port of
 * `@molecule/app-ide-react/src/__tests__/ShareLinkManager.refresh-signal.test.tsx`
 * with the same test name and the same assertions, mounted as a real Solid root
 * under `MoleculeProvider` with the theme and http services.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ShareLinkManager } from '../components/ShareLinkManager.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

const OLD_LINK: ShareLinkResult = { id: 'l1', slug: 'old-slug', role: 'viewer' }
const NEW_LINK: ShareLinkResult = { id: 'l2', slug: 'new-slug', role: 'viewer' }

/** What the next `GET /projects/:id/shares` answers with. */
let serverLinks: ShareLinkResult[] = []
/** Every shares URL the manager requested. */
const requestedUrls: string[] = []

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
 * Serves the current {@link serverLinks} for the shares list.
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      requestedUrls.push(url)
      return ok({ data: serverLinks })
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
  serverLinks = [OLD_LINK]
  requestedUrls.length = 0
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

describe('ShareLinkManager refreshSignal', () => {
  it('reloads the link list in place when the host bumps the signal', async () => {
    const [refreshSignal, setRefreshSignal] = createSignal(0)
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => (
        <MoleculeProvider theme={buildThemeProvider()} http={buildHttpClient()}>
          <ShareLinkManager projectId="p1" refreshSignal={refreshSignal()} />
        </MoleculeProvider>
      ),
      container,
    )
    const field = await vi.waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement
      expect(el).not.toBeNull()
      return el
    })
    expect(field.value).toMatch(/\/share\/old-slug$/)
    expect(requestedUrls).toHaveLength(1)

    // Another member revoked the old link and created a new one; the host's
    // broadcast bumps the signal.
    serverLinks = [NEW_LINK]
    setRefreshSignal(1)

    await vi.waitFor(() =>
      expect(
        (container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement).value,
      ).toMatch(/\/share\/new-slug$/),
    )
    expect(requestedUrls).toHaveLength(2)
    expect(requestedUrls[1]).toContain('/projects/p1/shares')
  })
})
