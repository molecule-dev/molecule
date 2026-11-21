// @vitest-environment jsdom
/**
 * Integration tests for the Solid `NotificationsPage` — a port of
 * `@molecule/app-notifications-page-react/src/__tests__/NotificationsPage.test.tsx`:
 * the same test names and behavioral assertions, rendered with Solid in jsdom
 * under `MoleculeProvider` (the real service path) with a mock HTTP client.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX, ParentProps } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createMemoryRouter } from '@molecule/app-routing'
import { MoleculeProvider } from '@molecule/app-solid'

import { NotificationsPage } from '../NotificationsPage.jsx'
import type {
  NotificationsPageItem,
  NotificationsPageProps,
  NotificationsPageResult,
} from '../types.js'

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

/** What tears down the mounted app. */
const disposers: Array<() => void> = []

/**
 * Lets Solid's queued effects and the request promises settle.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Mounts `NotificationsPage` under `MoleculeProvider` with the mock client.
 *
 * @param client - The HTTP client the page reads.
 * @param props - The page's props.
 */
async function renderPage(client: HttpClient, props: NotificationsPageProps = {}): Promise<void> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const router = createMemoryRouter({ initialEntries: ['/'] })
  const Wrapper = (inner: ParentProps): JSX.Element => (
    <MoleculeProvider http={client} router={router}>
      {inner.children}
    </MoleculeProvider>
  )
  const dispose = render(
    () => (
      <Wrapper>
        <NotificationsPage {...props} />
      </Wrapper>
    ),
    container,
  )
  disposers.push(() => {
    dispose()
    container.remove()
  })
  await settle()
}

/**
 * Waits for a condition the page reaches asynchronously.
 *
 * @param assertion - The condition to wait for.
 */
async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(assertion, { timeout: 2000, interval: 10 })
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<NotificationsPage>', () => {
  it('hits the default endpoint with limit/offset and renders items', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    await renderPage(client)

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

    await renderPage(client)

    await waitFor(() => expect(document.body.textContent).toMatch(/all caught up/i))
  })

  it('switching to "Unread" filter sends read=false and resets offset', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    await renderPage(client)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    const unreadTab = await vi.waitFor(() => {
      const tab = document.querySelector('[data-mol-id="notifications-page-filter-unread"]')
      expect(tab).toBeTruthy()
      return tab as HTMLButtonElement
    })
    unreadTab.click()
    await settle()

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    const url = String(get.mock.calls[1]![0])
    expect(url).toContain('read=false')
    expect(url).toContain('offset=0')
  })

  it('switching to "Mentions" sends type=mention', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    await renderPage(client)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    const mentionsTab = await vi.waitFor(() => {
      const tab = document.querySelector('[data-mol-id="notifications-page-filter-mentions"]')
      expect(tab).toBeTruthy()
      return tab as HTMLButtonElement
    })
    mentionsTab.click()
    await settle()

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(String(get.mock.calls[1]![0])).toContain('type=mention')
  })

  it('mark-all-read posts to the read-all endpoint and reloads', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const post = vi.fn().mockResolvedValue(ok({ ok: true }))
    const client = buildMockHttpClient({ get, post })

    await renderPage(client)

    const button = await vi.waitFor(() => {
      const found = document.querySelector('[data-mol-id="notifications-page-mark-all-read"]')
      expect(found).toBeTruthy()
      return found as HTMLButtonElement
    })
    button.click()
    await settle()

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(String(post.mock.calls[0]![0])).toBe('/api/notifications/read-all')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  })

  it('renders an error message when the list endpoint rejects', async () => {
    const get = vi.fn().mockRejectedValue(new Error('boom'))
    const client = buildMockHttpClient({ get })

    await renderPage(client)

    await waitFor(() => expect(document.querySelector('[role="alert"]')).toBeTruthy())
  })

  it('respects custom pageSize and endpoint props', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([], 0)))
    const client = buildMockHttpClient({ get })

    await renderPage(client, { pageSize: 5, endpoint: '/v2/notifs' })

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = String(get.mock.calls[0]![0])
    expect(url.startsWith('/v2/notifs?')).toBe(true)
    expect(url).toContain('limit=5')
  })
})
