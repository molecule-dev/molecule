// @vitest-environment jsdom
/**
 * Unit tests of `NotificationsPage` — the port of
 * `@molecule/app-notifications-page-react/src/__tests__/NotificationsPage.test.tsx`.
 * The same test names and behavioral assertions, mounted through Angular's
 * real renderer (the `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) with `provideMolecule` wiring the mock HTTP
 * client and a memory router.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideMolecule } from '@molecule/app-angular'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createMemoryRouter } from '@molecule/app-routing'

import { NotificationsPage } from '../notifications-page.component.js'
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

/** The mounted page's app and container. */
let current: { flush(): Promise<void>; destroy(): Promise<void> } | null = null

/**
 * Drains microtasks and a macrotask, then refreshes the Angular app.
 */
async function flush(): Promise<void> {
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await current?.flush()
}

/**
 * Mounts `NotificationsPage` with the mock client and the page's props.
 *
 * @param client - The HTTP client the page reads.
 * @param props - The page's props.
 */
async function mountPage(client: HttpClient, props: NotificationsPageProps = {}): Promise<void> {
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideMolecule({ http: client, router: createMemoryRouter({ initialEntries: ['/'] }) }),
    ],
  })
  const ref = createComponent(NotificationsPage as Type<unknown>, {
    environmentInjector: appRef.injector,
  })
  for (const [name, value] of Object.entries(props)) ref.setInput(name, value)
  const target = ref.location.nativeElement as HTMLElement
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.appendChild(target)
  appRef.attachView(ref.hostView)
  const tick = async (): Promise<void> => {
    appRef.tick()
    for (let i = 0; i < 3; i++) await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    appRef.tick()
  }
  await tick()
  current = {
    flush: tick,
    destroy: async () => {
      appRef.destroy()
      container.remove()
    },
  }
}

/**
 * Waits for a condition the page reaches asynchronously, refreshing the app.
 *
 * @param assertion - The condition to wait for.
 */
async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      current?.flush()
      assertion()
    },
    { timeout: 2000, interval: 10 },
  )
}

/** Clicks an element as a user would, then refreshes the app. */
async function click(selector: string): Promise<void> {
  const element = document.querySelector(selector) as HTMLButtonElement | null
  if (!element) throw new Error(`no element matches ${selector}`)
  element.click()
  await flush()
}

afterEach(async () => {
  if (current) await current.destroy()
  current = null
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<NotificationsPage>', () => {
  it('hits the default endpoint with limit/offset and renders items', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    await mountPage(client)

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

    await mountPage(client)

    await waitFor(() => expect(document.body.textContent).toMatch(/all caught up/i))
  })

  it('switching to "Unread" filter sends read=false and resets offset', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    await mountPage(client)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        document.querySelector('[data-mol-id="notifications-page-filter-unread"]'),
      ).toBeTruthy(),
    )

    await click('[data-mol-id="notifications-page-filter-unread"]')

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    const url = String(get.mock.calls[1]![0])
    expect(url).toContain('read=false')
    expect(url).toContain('offset=0')
  })

  it('switching to "Mentions" sends type=mention', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const client = buildMockHttpClient({ get })

    await mountPage(client)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        document.querySelector('[data-mol-id="notifications-page-filter-mentions"]'),
      ).toBeTruthy(),
    )

    await click('[data-mol-id="notifications-page-filter-mentions"]')

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(String(get.mock.calls[1]![0])).toContain('type=mention')
  })

  it('mark-all-read posts to the read-all endpoint and reloads', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult(SAMPLE_ITEMS)))
    const post = vi.fn().mockResolvedValue(ok({ ok: true }))
    const client = buildMockHttpClient({ get, post })

    await mountPage(client)

    await waitFor(() =>
      expect(
        document.querySelector('[data-mol-id="notifications-page-mark-all-read"]'),
      ).toBeTruthy(),
    )
    await click('[data-mol-id="notifications-page-mark-all-read"]')

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(String(post.mock.calls[0]![0])).toBe('/api/notifications/read-all')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  })

  it('renders an error message when the list endpoint rejects', async () => {
    const get = vi.fn().mockRejectedValue(new Error('boom'))
    const client = buildMockHttpClient({ get })

    await mountPage(client)

    await waitFor(() => expect(document.querySelector('[role="alert"]')).toBeTruthy())
  })

  it('respects custom pageSize and endpoint props', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([], 0)))
    const client = buildMockHttpClient({ get })

    await mountPage(client, { pageSize: 5, endpoint: '/v2/notifs' })

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = String(get.mock.calls[0]![0])
    expect(url.startsWith('/v2/notifs?')).toBe(true)
    expect(url).toContain('limit=5')
  })
})
