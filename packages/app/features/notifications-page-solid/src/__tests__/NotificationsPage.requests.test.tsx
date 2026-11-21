// @vitest-environment jsdom
/**
 * Request-ordering tests for the Solid `NotificationsPage` — a port of
 * `@molecule/app-notifications-page-react/src/__tests__/NotificationsPage.requests.test.tsx`:
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

/**
 * Clicks an element as a user would, then lets Solid's queue settle.
 *
 * @param selector - The element's selector.
 */
async function click(selector: string): Promise<void> {
  const element = document.querySelector(selector) as HTMLButtonElement | null
  if (!element) throw new Error(`no element matches ${selector}`)
  element.click()
  await settle()
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
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

    await renderPage(client)

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    await click('[data-mol-id="notifications-page-filter-unread"]')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    second.resolve(ok(makeResult([makeItem('n-new', 'Newest page')])))
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('Newest page'))

    first.resolve(ok(makeResult([makeItem('n-stale', 'Superseded page')])))
    await settle()
    await waitFor(() => expect(document.body.textContent).not.toContain('Superseded page'))
    expect(document.body.textContent).toContain('Newest page')
  })

  it('reports the page busy from the interaction until its response settles', async () => {
    const reload = deferred<HttpResponse<NotificationsPageResult>>()
    const get = vi.fn().mockResolvedValueOnce(ok(makeResult([])))
    get.mockReturnValueOnce(reload.promise)
    const client = buildMockHttpClient({ get })

    await renderPage(client)

    await waitFor(() => expect(document.body.textContent).toMatch(/all caught up/i))
    const page = document.querySelector('[data-mol-id="notifications-page"]')
    expect(page?.getAttribute('aria-busy')).toBeNull()

    await click('[data-mol-id="notifications-page-filter-unread"]')
    await waitFor(() => expect(page?.getAttribute('aria-busy')).toBe('true'))

    reload.resolve(ok(makeResult([])))
    await settle()
    await waitFor(() => expect(page?.getAttribute('aria-busy')).toBeNull())
  })

  it('sends no request when the active filter is re-selected on its first page', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([makeItem('n1', 'Only row')], 1)))
    const client = buildMockHttpClient({ get })

    await renderPage(client)

    await waitFor(() => expect(document.body.textContent).toContain('Only row'))
    await click('[data-mol-id="notifications-page-filter-all"]')

    expect(get).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('re-selecting the active filter on a later page returns to the first page', async () => {
    const get = vi.fn().mockResolvedValue(ok(makeResult([makeItem('n1', 'Row one')], 5)))
    const client = buildMockHttpClient({ get })

    await renderPage(client, { pageSize: 2 })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    await click('[data-mol-id="notifications-page-next"]')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(String(get.mock.calls[1]![0])).toContain('offset=2')

    await click('[data-mol-id="notifications-page-filter-all"]')
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3))
    expect(String(get.mock.calls[2]![0])).toContain('offset=0')
  })
})
