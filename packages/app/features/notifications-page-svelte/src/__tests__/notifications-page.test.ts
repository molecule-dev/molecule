// @vitest-environment jsdom
/**
 * Integration tests for the Svelte `NotificationsPage` — a port of
 * `@molecule/app-notifications-page-react/src/__tests__/NotificationsPage.test.tsx`:
 * the same test names and behavioral assertions, mounted through the Svelte
 * binding's own composition root (`setMoleculeContext`) with a mock HTTP client.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createMemoryRouter } from '@molecule/app-routing'

import type {
  NotificationsPageItem,
  NotificationsPageProps,
  NotificationsPageResult,
} from '../types.js'
import TestHost from './TestHost.svelte'

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
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '' },
  }
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

/** What tears down the mounted hosts. */
const mounted: Array<{ instance: Record<string, unknown>; container: HTMLElement }> = []

/**
 * Mounts the host with the mock client and the page's props.
 *
 * @param client - The HTTP client the page reads.
 * @param page - The page's props.
 */
function renderPage(client: HttpClient, page: NotificationsPageProps = {}): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const router = createMemoryRouter({ initialEntries: ['/'] })
  const instance = mount(TestHost, {
    target: container,
    props: { http: client, router, page },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
}

/**
 * Waits for a condition the page reaches asynchronously, flushing Svelte's queue.
 *
 * @param assertion - The condition to wait for.
 */
async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      flushSync()
      assertion()
    },
    { timeout: 2000, interval: 10 },
  )
}

/** Clicks an element as a user would, then flushes Svelte's queue. */
function click(selector: string): void {
  const element = document.querySelector(selector) as HTMLButtonElement | null
  if (!element) throw new Error(`no element matches ${selector}`)
  element.click()
  flushSync()
}

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    void unmount(entry.instance)
    entry.container.remove()
  }
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<NotificationsPage>', () => {
  it('hits the default endpoint with limit/offset and renders items', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    renderPage(client)

    await waitFor(() => expect(get).toHaveBeenCalled())

    const url = String(get.mock.calls[0]![0])
    expect(url).toContain('/api/notifications')
    expect(url).toContain('limit=20')
    expect(url).toContain('offset=0')
    expect(url).not.toContain('read=')
    expect(url).not.toContain('type=')

    await waitFor(() => expect(document.body.textContent).toContain('New DM'))
    expect(document.body.textContent).toContain('Welcome')
  })

  it('renders empty state when there are no notifications', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([])))
    const client = buildMockHttpClient({ get })

    renderPage(client)

    await waitFor(() => expect(document.body.textContent).toMatch(/all caught up/i))
  })

  it('switching to "Unread" filter sends read=false and resets offset', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    renderPage(client)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        document.querySelector('[data-mol-id="notifications-page-filter-unread"]'),
      ).toBeTruthy(),
    )

    click('[data-mol-id="notifications-page-filter-unread"]')

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    const url = String(get.mock.calls[1]![0])
    expect(url).toContain('read=false')
    expect(url).toContain('offset=0')
  })

  it('switching to "Mentions" sends type=mention', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    renderPage(client)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        document.querySelector('[data-mol-id="notifications-page-filter-mentions"]'),
      ).toBeTruthy(),
    )

    click('[data-mol-id="notifications-page-filter-mentions"]')

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(String(get.mock.calls[1]![0])).toContain('type=mention')
  })

  it('mark-all-read posts to the read-all endpoint and reloads', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const post = vi.fn().mockResolvedValue(ok({ ok: true }))
    const client = buildMockHttpClient({ get, post })

    renderPage(client)

    await waitFor(() =>
      expect(
        document.querySelector('[data-mol-id="notifications-page-mark-all-read"]'),
      ).toBeTruthy(),
    )
    click('[data-mol-id="notifications-page-mark-all-read"]')

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(String(post.mock.calls[0]![0])).toBe('/api/notifications/read-all')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  })

  it('renders an error message when the list endpoint rejects', async () => {
    const get = vi.fn().mockRejectedValue(new Error('boom'))
    const client = buildMockHttpClient({ get })

    renderPage(client)

    await waitFor(() => expect(document.querySelector('[role="alert"]')).toBeTruthy())
  })

  it('respects custom pageSize and endpoint props', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([], 0)))
    const client = buildMockHttpClient({ get })

    renderPage(client, { pageSize: 5, endpoint: '/v2/notifs' })

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = String(get.mock.calls[0]![0])
    expect(url.startsWith('/v2/notifs?')).toBe(true)
    expect(url).toContain('limit=5')
  })
})
