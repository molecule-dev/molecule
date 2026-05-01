// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { HttpProvider, I18nProvider } from '@molecule/app-react'
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
 * Wrap data in a successful HttpResponse envelope.
 *
 * @param data - The body.
 * @returns A fake HttpResponse.
 */
function ok<T>(data: T): HttpResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} }
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
  return (
    <MemoryRouter>
      <HttpProvider client={client}>
        <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
      </HttpProvider>
    </MemoryRouter>
  )
}

const SAMPLE_ITEMS: NotificationsPageItem[] = [
  {
    id: 'n1',
    type: 'message',
    title: 'New DM',
    body: 'Hello there.',
    read: false,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: 'n2',
    type: 'mention',
    title: 'You were mentioned',
    body: '@you check this out',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    data: { href: '/threads/42' },
  },
  {
    id: 'n3',
    type: 'system',
    title: 'Welcome',
    body: 'Thanks for joining',
    read: true,
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('<NotificationsPage>', () => {
  it('hits the default endpoint with limit/offset and renders items', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    await waitFor(() => expect(get).toHaveBeenCalled())

    const url = String(get.mock.calls[0]![0])
    expect(url).toContain('/api/notifications')
    expect(url).toContain('limit=20')
    expect(url).toContain('offset=0')
    expect(url).not.toContain('read=')
    expect(url).not.toContain('type=')

    expect(await screen.findByText('New DM')).toBeTruthy()
    expect(await screen.findByText('Welcome')).toBeTruthy()
  })

  it('renders empty state when there are no notifications', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([])))
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    expect(await screen.findByText(/all caught up/i)).toBeTruthy()
  })

  it('switching to "Unread" filter sends read=false and resets offset', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
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
    const url = String(get.mock.calls[1]![0])
    expect(url).toContain('read=false')
    expect(url).toContain('offset=0')
  })

  it('switching to "Mentions" sends type=mention', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    const mentionsTab = await screen.findByRole('tab', { name: 'Mentions' })
    await act(async () => {
      mentionsTab.click()
    })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(String(get.mock.calls[1]![0])).toContain('type=mention')
  })

  it('mark-all-read posts to the read-all endpoint and reloads', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const post = vi.fn().mockResolvedValue(ok({ ok: true }))
    const client = buildMockHttpClient({ get, post })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    const button = await screen.findByText(/Mark .* as read/i)
    await act(async () => {
      button.click()
    })

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(String(post.mock.calls[0]![0])).toBe('/api/notifications/read-all')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  })

  it('renders an error message when the list endpoint rejects', async () => {
    const get = vi.fn().mockRejectedValue(new Error('boom'))
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage />
      </Wrap>,
    )

    expect(await screen.findByRole('alert')).toBeTruthy()
  })

  it('respects custom pageSize and endpoint props', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([], 0)))
    const client = buildMockHttpClient({ get })

    render(
      <Wrap client={client}>
        <NotificationsPage pageSize={5} endpoint="/v2/notifs" />
      </Wrap>,
    )

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = String(get.mock.calls[0]![0])
    expect(url.startsWith('/v2/notifs?')).toBe(true)
    expect(url).toContain('limit=5')
  })
})
