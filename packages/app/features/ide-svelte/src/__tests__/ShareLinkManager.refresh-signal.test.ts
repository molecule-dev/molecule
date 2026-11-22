// @vitest-environment jsdom

/**
 * `ShareLinkManager`'s `refreshSignal`.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ShareLinkManager.refresh-signal.test.tsx`
 * with the same test name and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * The host bumps the signal when another member of the project created or
 * revoked the public link, and the open panel must reload the list in place (no
 * remount) so it reflects that change.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import ShareLinkManagerSignalHost from './ShareLinkManagerSignalHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

const OLD_LINK: ShareLinkResult = { id: 'l1', slug: 'old-slug', role: 'viewer' }
const NEW_LINK: ShareLinkResult = { id: 'l2', slug: 'new-slug', role: 'viewer' }

/** What the next `GET /projects/:id/shares` answers with. */
let serverLinks: ShareLinkResult[] = []
/** Every shares URL the manager requested. */
const requestedUrls: string[] = []

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
 * Serves the current {@link serverLinks} for the shares list.
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

/** Tears down the mount alive right now, if any. */
let teardown: (() => Promise<void>) | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setProvider(createSimpleI18nProvider('en'))
  serverLinks = [OLD_LINK]
  requestedUrls.length = 0
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
 * Mounts the manager at a refresh signal.
 *
 * @param refreshSignal - The host's live-update signal.
 * @returns The container and a signal bumper.
 */
function render(refreshSignal: number): {
  container: HTMLElement
  bumpSignal: (next: number) => void
} {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  const mounted = mount(ShareLinkManagerSignalHost, {
    target: container,
    props: {
      theme: buildThemeProvider(),
      http: buildHttpClient(),
      initial: { projectId: 'p1', refreshSignal },
    },
  })
  teardown = () => unmount(mounted)
  flushSync()
  const host = container
  return {
    container: host,
    bumpSignal: (next: number): void => {
      mounted.setProps({ projectId: 'p1', refreshSignal: next })
      flushSync()
    },
  }
}

describe('ShareLinkManager refreshSignal', () => {
  it('reloads the link list in place when the host bumps the signal', async () => {
    const { container: host, bumpSignal } = render(0)
    const field = await vi.waitFor(() => {
      const el = host.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el as HTMLInputElement
    })
    expect(field.value).toMatch(/\/share\/old-slug$/)
    expect(requestedUrls).toHaveLength(1)

    // Another member revoked the old link and created a new one; the host's
    // broadcast bumps the signal.
    serverLinks = [NEW_LINK]
    bumpSignal(1)

    await vi.waitFor(() =>
      expect(
        (host.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement).value,
      ).toMatch(/\/share\/new-slug$/),
    )
    expect(requestedUrls).toHaveLength(2)
    expect(requestedUrls[1]).toContain('/projects/p1/shares')
  })
})
