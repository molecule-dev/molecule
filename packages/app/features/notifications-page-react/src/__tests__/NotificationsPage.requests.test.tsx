// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { HttpProvider, I18nProvider, RouterProvider } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { NotificationsPage } from '../NotificationsPage.js'
import type { NotificationsPageItem, NotificationsPageResult } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Build a paginated result fixture.
 *
 * @param items - Notifications to include.
 * @param total - Total matching count (defaults to `items.length`).
 * @returns A NotificationsPageResult.
 */
function makeResult(
  items: NotificationsPageItem[],
  total: number = items.length,
): NotificationsPageResult {
  return { items, total, offset: 0, limit: 20 }
}

/**
 * Build a single notification row.
 *
 * @param id - Identifier.
 * @param title - Headline shown in the feed.
 * @param read - Whether the row is already read.
 * @returns A notification item.
 */
function makeItem(id: string, title: string, read = false): NotificationsPageItem {
  return { id, type: 'message', title, body: '', read, createdAt: '2026-01-01T00:00:00.000Z' }
}

/**
 * Wrap data in a successful HttpResponse envelope.
 *
 * @param data - The body.
 * @returns A fake HttpResponse.
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
 * A promise whose settlement the test controls.
 *
 * @returns The promise plus its resolve/reject functions.
 */
function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * Build a mock HttpClient with controllable get/post responses.
 *
 * @param overrides - Per-method overrides.
 * @returns A mock HttpClient.
 */
function buildMockHttpClient(
  overrides: Partial<Pick<HttpClient, 'get' | 'post'>> = {},
): HttpClient {
  return {
    baseURL: '',
    defaultHeaders: {},
    get:
      overrides.get ?? vi.fn().mockResolvedValue(ok({ items: [], total: 0, offset: 0, limit: 20 })),
    post: overrides.post ?? vi.fn().mockResolvedValue(ok({ ok: true })),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    setAuthToken: vi.fn(),
    getAuthToken: () => null,
    onAuthError: () => () => {},
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
  }
}

/**
 * Wrap children in HttpProvider + I18nProvider.
 *
 * @param props - Props.
 * @param props.client - The HttpClient.
 * @param props.children - Children.
 * @returns The wrapped element tree.
 */
function Wrap({
  client,
  children,
}: {
  client: HttpClient
  children: ReactNode
}): React.ReactElement {
  const [router] = React.useState(() => createMemoryRouter({ initialEntries: ['/'] }))
  return (
    <RouterProvider router={router}>
      <HttpProvider client={client}>
        <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
      </HttpProvider>
    </RouterProvider>
  )
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('<NotificationsPage> request ordering', () => {
  it('keeps the newest page when a superseded request answers last', async () => {
    const first = deferred<HttpResponse<NotificationsPageResult>>()
    const second = deferred<HttpResponse<NotificationsPageResult>>()
    const get = vi.fn()
    get.mockReturnValueOnce(first.promise)
    get.mockReturnValueOnce(second.promise)
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    const unreadTab = await screen.findByRole('tab', { name: 'Unread' })
    await act(async () => {
      unreadTab.click()
    })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    await act(async () => {
      second.resolve(ok(makeResult([makeItem('n-new', 'Newest page')])))
    })
    expect(await screen.findByText('Newest page')).toBeTruthy()

    await act(async () => {
      first.resolve(ok(makeResult([makeItem('n-stale', 'Superseded page')])))
    })
    await waitFor(() => expect(screen.queryByText('Superseded page')).toBeNull())
    expect(screen.getByText('Newest page')).toBeTruthy()
  })

  it('reports the page busy from the interaction until its response settles', async () => {
    const reload = deferred<HttpResponse<NotificationsPageResult>>()
    const get = vi.fn().mockResolvedValueOnce(ok(makeResult([])))
    get.mockReturnValueOnce(reload.promise)
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    expect(await screen.findByText(/all caught up/i)).toBeTruthy()
    const page = document.querySelector('[data-mol-id="notifications-page"]')
    expect(page?.getAttribute('aria-busy')).toBeNull()

    const unreadTab = screen.getByRole('tab', { name: 'Unread' })
    await act(async () => {
      unreadTab.click()
    })
    await waitFor(() => expect(page?.getAttribute('aria-busy')).toBe('true'))

    await act(async () => {
      reload.resolve(ok(makeResult([])))
    })
    await waitFor(() => expect(page?.getAttribute('aria-busy')).toBeNull())
  })

  it('sends no request when the active filter is re-selected on its first page', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([makeItem('n1', 'Only row')], 1)))
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    expect(await screen.findByText('Only row')).toBeTruthy()
    const allTab = screen.getByRole('tab', { name: 'All' })
    await act(async () => {
      allTab.click()
    })

    expect(get).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('re-selecting the active filter on a later page returns to the first page', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([makeItem('n1', 'Row one')], 5)))
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage pageSize={2} />
      </Wrap>,
    )

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    const next = await screen.findByRole('button', { name: 'Next' })
    await act(async () => {
      next.click()
    })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(String(get.mock.calls[1]![0])).toContain('offset=2')

    const allTab = screen.getByRole('tab', { name: 'All' })
    await act(async () => {
      allTab.click()
    })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3))
    expect(String(get.mock.calls[2]![0])).toContain('offset=0')
  })
})
