import { beforeEach, describe, expect, it, vi } from 'vitest'

/* ------------------------------------------------------------------ */
/*  Mock @molecule/api-notification-center                             */
/* ------------------------------------------------------------------ */

const mockGetAll = vi.fn()
const mockGetUnreadCount = vi.fn()
const mockMarkRead = vi.fn()
const mockMarkAllRead = vi.fn()
const mockDeleteNotification = vi.fn()
const mockGetPreferences = vi.fn()
const mockSetPreferences = vi.fn()

vi.mock('@molecule/api-notification-center', () => ({
  getAll: mockGetAll,
  getUnreadCount: mockGetUnreadCount,
  markRead: mockMarkRead,
  markAllRead: mockMarkAllRead,
  deleteNotification: mockDeleteNotification,
  getPreferences: mockGetPreferences,
  setPreferences: mockSetPreferences,
}))

/* ------------------------------------------------------------------ */
/*  Test helpers                                                       */
/* ------------------------------------------------------------------ */

interface MockResponse {
  statusCode: number
  body: unknown
  ended: boolean
  json: (data: unknown) => MockResponse
  status: (code: number) => MockResponse
  end: () => void
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    ended: false,
    json(data: unknown) {
      res.body = data
      return res
    },
    status(code: number) {
      res.statusCode = code
      return res
    },
    end() {
      res.ended = true
    },
  }
  return res
}

function createMockReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user: { id: 'user-1' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-resource-notification handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns paginated notifications for the user', async () => {
      const { list } = await import('../handlers/list.js')
      const result = { items: [], total: 0, offset: 0, limit: 50 }
      mockGetAll.mockResolvedValueOnce(result)

      const req = createMockReq({ query: {} })
      const res = createMockRes()

      await list(req as never, res as never)

      expect(mockGetAll).toHaveBeenCalledWith('user-1', {
        limit: undefined,
        offset: undefined,
        read: undefined,
        type: undefined,
      })
      expect(res.body).toEqual(result)
    })

    it('passes query params to getAll', async () => {
      const { list } = await import('../handlers/list.js')
      mockGetAll.mockResolvedValueOnce({ items: [], total: 0, offset: 0, limit: 10 })

      const req = createMockReq({
        query: { limit: '10', offset: '5', read: 'false', type: 'alert' },
      })
      const res = createMockRes()

      await list(req as never, res as never)

      expect(mockGetAll).toHaveBeenCalledWith('user-1', {
        limit: 10,
        offset: 5,
        read: false,
        type: 'alert',
      })
    })
  })

  describe('unreadCount', () => {
    it('returns unread notification count', async () => {
      const { unreadCount } = await import('../handlers/unread-count.js')
      mockGetUnreadCount.mockResolvedValueOnce(7)

      const req = createMockReq()
      const res = createMockRes()

      await unreadCount(req as never, res as never)

      expect(mockGetUnreadCount).toHaveBeenCalledWith('user-1')
      expect(res.body).toEqual({ count: 7 })
    })
  })

  describe('markReadHandler', () => {
    it('marks a notification as read', async () => {
      const { markReadHandler } = await import('../handlers/mark-read.js')
      mockMarkRead.mockResolvedValueOnce(undefined)

      const req = createMockReq({ params: { id: 'notif-1' } })
      const res = createMockRes()

      await markReadHandler(req as never, res as never)

      expect(mockMarkRead).toHaveBeenCalledWith('notif-1')
      expect(res.statusCode).toBe(204)
      expect(res.ended).toBe(true)
    })
  })

  describe('markAllReadHandler', () => {
    it('marks all notifications as read for the user', async () => {
      const { markAllReadHandler } = await import('../handlers/mark-all-read.js')
      mockMarkAllRead.mockResolvedValueOnce(undefined)

      const req = createMockReq()
      const res = createMockRes()

      await markAllReadHandler(req as never, res as never)

      expect(mockMarkAllRead).toHaveBeenCalledWith('user-1')
      expect(res.statusCode).toBe(204)
    })
  })

  describe('del', () => {
    it('deletes a notification', async () => {
      const { del } = await import('../handlers/del.js')
      mockDeleteNotification.mockResolvedValueOnce(undefined)

      const req = createMockReq({ params: { id: 'notif-1' } })
      const res = createMockRes()

      await del(req as never, res as never)

      expect(mockDeleteNotification).toHaveBeenCalledWith('notif-1')
      expect(res.statusCode).toBe(204)
    })
  })

  describe('getPreferencesHandler', () => {
    it('returns user notification preferences', async () => {
      const { getPreferencesHandler } = await import('../handlers/get-preferences.js')
      const prefs = { email: true, push: false, sms: false, channels: {} }
      mockGetPreferences.mockResolvedValueOnce(prefs)

      const req = createMockReq()
      const res = createMockRes()

      await getPreferencesHandler(req as never, res as never)

      expect(mockGetPreferences).toHaveBeenCalledWith('user-1')
      expect(res.body).toEqual(prefs)
    })
  })

  describe('updatePreferencesHandler', () => {
    it('updates user notification preferences', async () => {
      const { updatePreferencesHandler } = await import('../handlers/update-preferences.js')
      mockSetPreferences.mockResolvedValueOnce(undefined)

      const req = createMockReq({ body: { email: false, push: true } })
      const res = createMockRes()

      await updatePreferencesHandler(req as never, res as never)

      expect(mockSetPreferences).toHaveBeenCalledWith('user-1', { email: false, push: true })
      expect(res.statusCode).toBe(204)
    })
  })
})

describe('routes', () => {
  it('defines all notification routes', async () => {
    const { routes } = await import('../routes.js')

    expect(routes).toHaveLength(7)

    const paths = routes.map((r) => `${r.method} ${r.path}`)
    expect(paths).toContain('get /notifications')
    expect(paths).toContain('get /notifications/unread-count')
    expect(paths).toContain('get /notifications/preferences')
    expect(paths).toContain('post /notifications/:id/read')
    expect(paths).toContain('post /notifications/read-all')
    expect(paths).toContain('put /notifications/preferences')
    expect(paths).toContain('delete /notifications/:id')
  })
})

describe('requestHandlerMap', () => {
  it('maps all route handlers', async () => {
    const { requestHandlerMap } = await import('../requestHandlerMap.js')

    expect(typeof requestHandlerMap.list).toBe('function')
    expect(typeof requestHandlerMap.unreadCount).toBe('function')
    expect(typeof requestHandlerMap.markRead).toBe('function')
    expect(typeof requestHandlerMap.markAllRead).toBe('function')
    expect(typeof requestHandlerMap.del).toBe('function')
    expect(typeof requestHandlerMap.getPreferences).toBe('function')
    expect(typeof requestHandlerMap.updatePreferences).toBe('function')
  })
})
