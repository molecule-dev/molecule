/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default notification
 * center bond with the API behind `@molecule/app-http` (`fetch`) stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { get, post } from '@molecule/app-http'
import { provider } from '@molecule/app-notification-center-default'

import type { AppNotification, NotificationCenterState } from '../index.js'
import { createNotificationCenter, setProvider } from '../index.js'

type NotificationJson = Omit<AppNotification, 'createdAt'> & { createdAt: string }
type Page = { items: NotificationJson[]; nextCursor?: string; hasMore: boolean }

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the first page, reports unread count and marks a notification read', async () => {
    const page: Page = {
      items: [
        {
          id: 'n1',
          type: 'comment',
          title: 'New comment',
          body: 'Ada replied to your post',
          read: false,
          createdAt: '2026-09-01T10:00:00.000Z',
        },
      ],
      hasMore: false,
    }
    const fetchMock = vi.fn(async (url: string, _init: RequestInit) => {
      if (url.startsWith('/notifications?')) return json(page)
      if (url === '/notifications/unread-count') return json({ count: 1 })
      return json({ ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(provider)

    const center = createNotificationCenter({
      fetchNotifications: async ({ cursor, limit }) => {
        const { data } = await get<Page>('/notifications', { params: { cursor, limit } })
        return {
          ...data,
          items: data.items.map((n) => ({ ...n, createdAt: new Date(n.createdAt) })),
        }
      },
      fetchUnreadCount: async () =>
        (await get<{ count: number }>('/notifications/unread-count')).data.count,
      markAsRead: async (id) => {
        await post(`/notifications/${id}/read`)
      },
      markAllAsRead: async () => {
        await post('/notifications/read-all')
      },
      pollInterval: 30_000,
    })

    const states: NotificationCenterState[] = []
    center.onUpdate((state) => states.push(state))
    expect(fetchMock).not.toHaveBeenCalled()

    await center.refresh()
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/notifications?limit=20',
      '/notifications/unread-count',
    ])
    expect(states.at(-1)?.unreadCount).toBe(1)
    expect(states.at(-1)?.lastError).toBeUndefined()

    const [newest] = center.getNotifications()
    expect(newest?.createdAt).toBeInstanceOf(Date)
    if (newest) await center.markAsRead(newest.id)
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/notifications/n1/read')
    expect(fetchMock.mock.calls.at(-1)?.[1]?.method).toBe('POST')
    expect(center.getUnreadCount()).toBe(0)

    center.destroy()
  })
})
