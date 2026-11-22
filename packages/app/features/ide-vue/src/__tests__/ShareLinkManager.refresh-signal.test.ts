// @vitest-environment jsdom

/**
 * `ShareLinkManager`'s `refreshSignal`: the host bumps it when another member of
 * the project created or revoked the public link, and the open panel must reload
 * the list in place (no remount) so it reflects that change.
 *
 * Port of
 * `@molecule/app-ide-react/src/__tests__/ShareLinkManager.refresh-signal.test.tsx`
 * with the same test name and the same assertions, mounted through Vue's own
 * `createApp` with the theme and http plugins (the providers the manager needs).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type VNodeChild } from 'vue'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin, createThemePlugin } from '@molecule/app-vue'

import { ShareLinkManager } from '../components/ShareLinkManager.js'
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
    get: async (url: string): Promise<HttpResponse<never>> => {
      requestedUrls.push(url)
      return responseOf({ data: serverLinks })
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

/** The reactive props the host renders the manager with. */
interface ManagerProps {
  /** The project whose public link is managed. */
  projectId: string
  /** The host's live-update signal. */
  refreshSignal: number
}

/**
 * Mounts {@link ShareLinkManager} over the stub client.
 *
 * @param initial - The host's props.
 * @returns The mount host and the reactive props to drive the signal.
 */
function mount(initial: ManagerProps): { container: HTMLElement; props: ManagerProps } {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const props = reactive<ManagerProps>({ ...initial })
  const app = createApp({
    render: (): VNodeChild =>
      h(ShareLinkManager, { projectId: props.projectId, refreshSignal: props.refreshSignal }),
  })
  app.use(createThemePlugin(buildThemeProvider()))
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(host)
  return { container: host, props }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  serverLinks = [OLD_LINK]
  requestedUrls.length = 0
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  mounted.host?.remove()
  mounted.host = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('ShareLinkManager refreshSignal', () => {
  it('reloads the link list in place when the host bumps the signal', async () => {
    const { container, props } = mount({ projectId: 'p1', refreshSignal: 0 })
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
    props.refreshSignal = 1
    await nextTick()

    await vi.waitFor(() =>
      expect(
        (container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement).value,
      ).toMatch(/\/share\/new-slug$/),
    )
    expect(requestedUrls).toHaveLength(2)
    expect(requestedUrls[1]).toContain('/projects/p1/shares')
  })
})
