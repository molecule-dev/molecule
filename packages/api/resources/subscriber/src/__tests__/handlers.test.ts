const {
  mockCreate,
  mockFindOne,
  mockFindMany,
  mockFindById,
  mockUpdateById,
  mockDeleteById,
  mockCount,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
  mockCount: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
  count: mockCount,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { confirm } from '../handlers/confirm.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { subscribe } from '../handlers/subscribe.js'
import { unsubscribe } from '../handlers/unsubscribe.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    send: vi.fn(),
    set: vi.fn(),
    setHeader: vi.fn(),
    cookie: vi.fn(),
    write: vi.fn(),
    locals: {},
  }
  return res
}

const SUBSCRIBER_ROW = {
  id: 'sub-1',
  channel: 'email',
  address: 'a@b.co',
  topic: 'incident-updates',
  status: 'pending',
  confirmToken: 'confirm-tok',
  unsubscribeToken: 'unsub-tok',
  metadata: null,
  confirmedAt: null,
  unsubscribedAt: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
}

describe('@molecule/api-resource-subscriber handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('subscribe', () => {
    it('rejects an invalid channel', async () => {
      const req = mockReq({ body: { channel: 'push', address: 'a@b.co' } })
      const res = mockRes()

      await subscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'subscriber.error.invalidChannel' }),
      )
    })

    it('rejects an invalid address for the chosen channel', async () => {
      const req = mockReq({ body: { channel: 'email', address: 'not-an-email' } })
      const res = mockRes()

      await subscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'subscriber.error.invalidAddress' }),
      )
    })

    it('returns 409 when an identical subscription already exists', async () => {
      mockFindOne.mockResolvedValueOnce(SUBSCRIBER_ROW)

      const req = mockReq({
        body: { channel: 'email', address: 'a@b.co', topic: 'incident-updates' },
      })
      const res = mockRes()

      await subscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'subscriber.error.alreadyExists' }),
      )
    })

    it('creates a pending subscriber and returns tokens', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      mockCreate.mockResolvedValueOnce({ data: SUBSCRIBER_ROW, affected: 1 })

      const req = mockReq({
        body: { channel: 'email', address: 'a@b.co', topic: 'incident-updates' },
      })
      const res = mockRes()

      await subscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCreate).toHaveBeenCalledWith(
        'subscribers',
        expect.objectContaining({
          channel: 'email',
          address: 'a@b.co',
          topic: 'incident-updates',
          status: 'pending',
          confirmedAt: null,
          unsubscribedAt: null,
        }),
      )

      const body = res.json.mock.calls[0][0]
      expect(body).toHaveProperty('subscriber')
      expect(body).toHaveProperty('confirmToken')
      expect(body).toHaveProperty('unsubscribeToken')
      // Public subscriber must not leak tokens
      expect(body.subscriber).not.toHaveProperty('confirmToken')
      expect(body.subscriber).not.toHaveProperty('unsubscribeToken')
      expect(typeof body.confirmToken).toBe('string')
      expect(typeof body.unsubscribeToken).toBe('string')
      expect(body.confirmToken).not.toBe(body.unsubscribeToken)
    })

    it('uses is_null when topic is omitted', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      mockCreate.mockResolvedValueOnce({ data: { ...SUBSCRIBER_ROW, topic: null }, affected: 1 })

      const req = mockReq({ body: { channel: 'email', address: 'a@b.co' } })
      const res = mockRes()

      await subscribe(req, res)

      expect(mockFindOne).toHaveBeenCalledWith(
        'subscribers',
        expect.arrayContaining([expect.objectContaining({ field: 'topic', operator: 'is_null' })]),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('serializes metadata as JSON', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      mockCreate.mockResolvedValueOnce({ data: SUBSCRIBER_ROW, affected: 1 })

      const req = mockReq({
        body: { channel: 'email', address: 'a@b.co', metadata: { source: 'footer' } },
      })
      const res = mockRes()

      await subscribe(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'subscribers',
        expect.objectContaining({ metadata: JSON.stringify({ source: 'footer' }) }),
      )
    })

    it('returns 500 on database failure', async () => {
      mockFindOne.mockRejectedValueOnce(new Error('db down'))

      const req = mockReq({ body: { channel: 'email', address: 'a@b.co' } })
      const res = mockRes()

      await subscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'subscriber.error.createFailed' }),
      )
    })
  })

  describe('confirm', () => {
    it('returns 400 when token is missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await confirm(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 for an unknown token', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      const req = mockReq({ params: { token: 'nope' } })
      const res = mockRes()

      await confirm(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'subscriber.error.invalidToken' }),
      )
    })

    it('rejects an unsubscribed record with 409', async () => {
      mockFindOne.mockResolvedValueOnce({ ...SUBSCRIBER_ROW, status: 'unsubscribed' })

      const req = mockReq({ params: { token: SUBSCRIBER_ROW.confirmToken } })
      const res = mockRes()

      await confirm(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'subscriber.error.alreadyUnsubscribed' }),
      )
    })

    it('is idempotent for already-confirmed records', async () => {
      mockFindOne.mockResolvedValueOnce({
        ...SUBSCRIBER_ROW,
        status: 'confirmed',
        confirmedAt: '2026-05-01T01:00:00.000Z',
      })

      const req = mockReq({ params: { token: SUBSCRIBER_ROW.confirmToken } })
      const res = mockRes()

      await confirm(req, res)

      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('confirms a pending subscriber', async () => {
      mockFindOne.mockResolvedValueOnce(SUBSCRIBER_ROW)
      mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })

      const req = mockReq({ params: { token: SUBSCRIBER_ROW.confirmToken } })
      const res = mockRes()

      await confirm(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'subscribers',
        SUBSCRIBER_ROW.id,
        expect.objectContaining({ status: 'confirmed', confirmedAt: expect.any(String) }),
      )
      expect(res.status).toHaveBeenCalledWith(200)
      const body = res.json.mock.calls[0][0]
      expect(body.status).toBe('confirmed')
      expect(body).not.toHaveProperty('confirmToken')
    })
  })

  describe('unsubscribe', () => {
    it('returns 400 when token is missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await unsubscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 for an unknown token', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      const req = mockReq({ params: { token: 'nope' } })
      const res = mockRes()

      await unsubscribe(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('is idempotent for already-unsubscribed records', async () => {
      mockFindOne.mockResolvedValueOnce({
        ...SUBSCRIBER_ROW,
        status: 'unsubscribed',
        unsubscribedAt: '2026-05-01T02:00:00.000Z',
      })

      const req = mockReq({ params: { token: SUBSCRIBER_ROW.unsubscribeToken } })
      const res = mockRes()

      await unsubscribe(req, res)

      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('unsubscribes a confirmed subscriber', async () => {
      mockFindOne.mockResolvedValueOnce({ ...SUBSCRIBER_ROW, status: 'confirmed' })
      mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })

      const req = mockReq({ params: { token: SUBSCRIBER_ROW.unsubscribeToken } })
      const res = mockRes()

      await unsubscribe(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'subscribers',
        SUBSCRIBER_ROW.id,
        expect.objectContaining({ status: 'unsubscribed', unsubscribedAt: expect.any(String) }),
      )
      const body = res.json.mock.calls[0][0]
      expect(body.status).toBe('unsubscribed')
      expect(body).not.toHaveProperty('unsubscribeToken')
    })
  })

  describe('list', () => {
    it('returns paginated subscribers', async () => {
      mockCount.mockResolvedValueOnce(1)
      mockFindMany.mockResolvedValueOnce([SUBSCRIBER_ROW])

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ id: 'sub-1' })],
          total: 1,
          page: 1,
          limit: 20,
        }),
      )
      // Tokens stripped
      const body = res.json.mock.calls[0][0]
      expect(body.data[0]).not.toHaveProperty('confirmToken')
      expect(body.data[0]).not.toHaveProperty('unsubscribeToken')
    })

    it('rejects invalid channel filter', async () => {
      const req = mockReq({ query: { channel: 'push' } })
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('rejects invalid status filter', async () => {
      const req = mockReq({ query: { status: 'archived' } })
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('forwards filters to the data store', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({
        query: {
          channel: 'email',
          status: 'confirmed',
          topic: 'newsletter',
          page: '2',
          limit: '5',
        },
      })
      const res = mockRes()

      await list(req, res)

      expect(mockCount).toHaveBeenCalledWith(
        'subscribers',
        expect.arrayContaining([
          expect.objectContaining({ field: 'channel', value: 'email' }),
          expect.objectContaining({ field: 'status', value: 'confirmed' }),
          expect.objectContaining({ field: 'topic', value: 'newsletter' }),
        ]),
      )
      expect(mockFindMany).toHaveBeenCalledWith(
        'subscribers',
        expect.objectContaining({ limit: 5, offset: 5 }),
      )
    })

    it('caps limit at 100', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({ query: { limit: '5000' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith(
        'subscribers',
        expect.objectContaining({ limit: 100 }),
      )
    })

    it('returns 500 on database error', async () => {
      mockCount.mockRejectedValueOnce(new Error('db down'))

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('read', () => {
    it('returns 404 for unknown id', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns the public subscriber for a known id', async () => {
      mockFindById.mockResolvedValueOnce(SUBSCRIBER_ROW)

      const req = mockReq({ params: { id: 'sub-1' } })
      const res = mockRes()

      await read(req, res)

      const body = res.json.mock.calls[0][0]
      expect(body.id).toBe('sub-1')
      expect(body).not.toHaveProperty('confirmToken')
      expect(body).not.toHaveProperty('unsubscribeToken')
    })
  })

  describe('del', () => {
    it('returns 404 when no row matched', async () => {
      mockDeleteById.mockResolvedValueOnce({ data: null, affected: 0 })

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 204 on successful delete', async () => {
      mockDeleteById.mockResolvedValueOnce({ data: null, affected: 1 })

      const req = mockReq({ params: { id: 'sub-1' } })
      const res = mockRes()

      await del(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('subscribers', 'sub-1')
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockDeleteById.mockRejectedValueOnce(new Error('db down'))

      const req = mockReq({ params: { id: 'sub-1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
