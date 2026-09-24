// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { MoleculeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { NotificationsPage } from '../index.js'

setClassMap(classMap) // startup — getClassMap() throws until then

/**
 * The README example, verbatim.
 *
 * @returns The rendered app.
 */
function App(): React.JSX.Element {
  // `http` feeds useHttpClient(), `i18n` feeds useTranslation(); the router is for `data.href` rows.
  return (
    <MoleculeProvider http={getClient()} i18n={createSimpleI18nProvider('en')}>
      <BrowserRouter>
        <NotificationsPage
          pageSize={25}
          endpoint="/api/notifications" // GET ?limit=25&offset=0 (+ read=false | type=mention)
          markAllReadEndpoint="/api/notifications/read-all" // POST
          typeIcons={{ deploy: 'rocket_launch' }}
        />
      </BrowserRouter>
    </MoleculeProvider>
  )
}

const now = Date.now()
let items = [
  {
    id: 'n1',
    type: 'deploy',
    title: 'Deploy finished',
    body: 'v2.3.0 is live',
    read: false,
    createdAt: new Date(now - 5 * 60_000).toISOString(),
    data: { href: '/deploys/7' },
  },
  {
    id: 'n2',
    type: 'mention',
    title: 'Ada mentioned you',
    body: '@you can you review?',
    read: false,
    createdAt: new Date(now - 2 * 3_600_000).toISOString(),
  },
]

/**
 * Builds a JSON response.
 *
 * @param body - Response body.
 * @returns The fetch response.
 */
function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads the list, filters, and marks everything read through the endpoints', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/notifications/read-all' && init?.method === 'POST') {
        items = items.map((n) => ({ ...n, read: true }))
        return json({})
      }
      const query = new URL(url, 'http://localhost').searchParams
      const filtered = items.filter(
        (n) =>
          (query.get('read') !== 'false' || !n.read) &&
          (query.get('type') === null || n.type === query.get('type')),
      )
      return json({ items: filtered, total: filtered.length, offset: 0, limit: 25 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const view = render(<App />)
    await waitFor(() => expect(view.getByText('Deploy finished')).toBeTruthy())
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/notifications?limit=25&offset=0')
    expect(view.getByText('rocket_launch')).toBeTruthy()
    expect(view.getByText('alternate_email')).toBeTruthy()
    expect(view.getByText('5m')).toBeTruthy()
    expect(view.getByRole('link').getAttribute('href')).toBe('/deploys/7')

    fireEvent.click(view.getByRole('tab', { name: 'Mentions' }))
    await waitFor(() => expect(view.queryByText('Deploy finished')).toBeNull())
    expect(view.getByText('Ada mentioned you')).toBeTruthy()
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(
      '/api/notifications?limit=25&offset=0&type=mention',
    )

    fireEvent.click(view.getByRole('tab', { name: 'All' }))
    await waitFor(() => expect(view.getByText('Mark 2 as read')).toBeTruthy())
    await act(async () => {
      fireEvent.click(view.getByText('Mark 2 as read'))
    })
    await waitFor(() => expect(view.queryByText(/Mark \d as read/)).toBeNull())
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === '/api/notifications/read-all' && init?.method === 'POST',
      ),
    ).toBe(true)
  })
})
