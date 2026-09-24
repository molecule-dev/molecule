// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { get, post } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import {
  type AppNotification,
  createNotificationCenter,
  type PaginatedResult,
  setProvider,
} from '@molecule/app-notification-center'
import { provider } from '@molecule/app-notification-center-default'
import { I18nProvider, RouterProvider, useNavigate } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { NotificationCenter } from '../index.js'

// Startup: bond the state provider once, then create one shared center.
setProvider(provider)
const center = createNotificationCenter({
  fetchNotifications: async ({ cursor, limit }) =>
    (
      await get<PaginatedResult<AppNotification>>('/notifications', {
        params: { cursor, limit },
      })
    ).data,
  fetchUnreadCount: async () =>
    (await get<{ count: number }>('/notifications/unread-count')).data.count,
  markAsRead: async (id) => {
    await post(`/notifications/${id}/read`)
  },
  markAllAsRead: async () => {
    await post('/notifications/read-all')
  },
})

/**
 * The README example, verbatim.
 *
 * @returns The rendered notification panel.
 */
function NotificationPanel(): React.JSX.Element {
  const navigate = useNavigate()
  const [state, setState] = useState(() => center.getState())
  useEffect(() => {
    center.onUpdate(setState) // re-render on every state change
    void center.refresh() // never rejects — failures land in state.lastError
    return () => center.offUpdate(setState)
  }, [])
  return (
    <NotificationCenter
      items={state.notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read,
        onClick: () => {
          center
            .markAsRead(n.id)
            .catch((error: unknown) => console.error('markAsRead failed', error))
          if (n.actionUrl) navigate(n.actionUrl)
        },
      }))}
      onMarkAllRead={() =>
        center
          .markAllAsRead()
          .catch((error: unknown) => console.error('markAllAsRead failed', error))
      }
      onViewAll={() => navigate('/notifications')}
      lastError={state.lastError}
      onRetry={() => void center.refresh()}
    />
  )
}

const page = {
  items: [
    {
      id: 'n1',
      type: 'comment',
      title: 'Ada commented',
      body: 'Looks great!',
      read: false,
      actionUrl: '/posts/42',
      createdAt: '2026-06-05T10:00:00.000Z',
    },
    {
      id: 'n2',
      type: 'system',
      title: 'Welcome aboard',
      body: 'Thanks for signing up.',
      read: true,
      createdAt: '2026-06-01T10:00:00.000Z',
    },
  ],
  hasMore: false,
}

/**
 * Builds a JSON response.
 *
 * @param body - Response body.
 * @param status - HTTP status.
 * @returns The fetch response.
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet) // the error banner's <Alert> icon throws without it
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads notifications, marks one read, navigates, and marks all read', async () => {
    let failList = true
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.startsWith('/notifications?')) return failList ? json({}, 503) : json(page)
      if (url === '/notifications/unread-count') return json({ count: 1 })
      return json({})
    })
    vi.stubGlobal('fetch', fetchMock)
    const router = createMemoryRouter({ initialEntries: ['/'] })
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <RouterProvider router={router}>
          <NotificationPanel />
        </RouterProvider>
      </I18nProvider>,
    )

    // First load fails → error banner with Retry; retry succeeds.
    await waitFor(() => expect(view.getByText('Could not load notifications.')).toBeTruthy())
    expect(view.getByText('No notifications')).toBeTruthy()
    failList = false
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Retry' }))
    })
    await waitFor(() => expect(view.getByText('Ada commented')).toBeTruthy())
    expect(view.queryByText('Could not load notifications.')).toBeNull()
    expect(fetchMock.mock.calls.some(([url]) => url === '/notifications?limit=20')).toBe(true)
    expect(view.getByText('Welcome aboard')).toBeTruthy()

    // Click an unread item → POST mark-read + navigate to its actionUrl.
    await act(async () => {
      fireEvent.click(view.getByText('Ada commented'))
    })
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url === '/notifications/n1/read' && init?.method === 'POST',
        ),
      ).toBe(true),
    )
    expect(router.getLocation().pathname).toBe('/posts/42')
    expect(center.getState().unreadCount).toBe(0)

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Mark all as read' }))
    })
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url === '/notifications/read-all')).toBe(true),
    )
    fireEvent.click(view.getByRole('button', { name: 'View all' }))
    expect(router.getLocation().pathname).toBe('/notifications')
  })
})
