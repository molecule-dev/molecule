// @vitest-environment jsdom

/**
 * `ShareLinkManager`'s `refreshSignal`: the host bumps it when another member of
 * the project created or revoked the public link, and the open panel must reload
 * the list in place (no remount) so it reflects that change.
 *
 * @module
 */

import { cleanup, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ShareLinkResult } from '@molecule/app-ide-panel-logic'
import { HttpProvider, ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

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
 * @param data - The response body.
 * @returns The response.
 */
function ok<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as HttpResponse<T>['config'],
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

/**
 * Wrap children with the providers the manager resolves against.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider provider={buildThemeProvider()}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </ThemeProvider>
  )
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  setI18nProvider(createSimpleI18nProvider('en'))
  serverLinks = [OLD_LINK]
  requestedUrls.length = 0
})

afterEach(cleanup)

describe('ShareLinkManager refreshSignal', () => {
  it('reloads the link list in place when the host bumps the signal', async () => {
    const { container, rerender } = render(
      <Wrap>
        <ShareLinkManager projectId="p1" refreshSignal={0} />
      </Wrap>,
    )
    const field = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement
      expect(el).not.toBeNull()
      return el
    })
    expect(field.value).toMatch(/\/share\/old-slug$/)
    expect(requestedUrls).toHaveLength(1)

    // Another member revoked the old link and created a new one; the host's
    // broadcast bumps the signal.
    serverLinks = [NEW_LINK]
    rerender(
      <Wrap>
        <ShareLinkManager projectId="p1" refreshSignal={1} />
      </Wrap>,
    )

    await waitFor(() =>
      expect(
        (container.querySelector('[data-mol-id="share-link-url"]') as HTMLInputElement).value,
      ).toMatch(/\/share\/new-slug$/),
    )
    expect(requestedUrls).toHaveLength(2)
    expect(requestedUrls[1]).toContain('/projects/p1/shares')
  })
})
