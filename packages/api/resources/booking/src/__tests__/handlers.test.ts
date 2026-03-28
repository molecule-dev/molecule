const { mockCreate, mockFindOne, mockFindMany, mockFindById, mockUpdateById, mockCount } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindById: vi.fn(),
    mockUpdateById: vi.fn(),
    mockCount: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  count: mockCount,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { book } from '../handlers/book.js'
import { cancel } from '../handlers/cancel.js'
import { checkAvailability } from '../handlers/checkAvailability.js'
import { complete } from '../handlers/complete.js'
import { confirm } from '../handlers/confirm.js'
import { getBookings } from '../handlers/getBookings.js'
import { getById } from '../handlers/getById.js'
import { reschedule } from '../handlers/reschedule.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

const BOOKING_ROW = {
  id: 'booking-1',
  userId: 'user-1',
  resourceType: 'room',
  resourceId: 'room-101',
  status: 'pending',
  startTime: '2024-06-15T10:00:00.000Z',
  endTime: '2024-06-15T11:00:00.000Z',
  duration: 60,
  notes: null,
  metadata: null,
  createdAt: '2024-06-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
}

describe('@molecule/api-resource-booking handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkAvailability', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({
        params: { resourceType: 'room', resourceId: 'room-101' },
        query: { date: '2024-06-15' },
      })
      const res = mockRes({ locals: {} })

      await checkAvailability(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when date is missing', async () => {
      const req = mockReq({
        params: { resourceType: 'room', resourceId: 'room-101' },
        query: {},
      })
      const res = mockRes()

      await checkAvailability(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.dateRequired' }),
      )
    })

    it('should return time slots with availability', async () => {
      mockFindMany.mockResolvedValueOnce([BOOKING_ROW]) // existing booking at 10:00-11:00

      const req = mockReq({
        params: { resourceType: 'room', resourceId: 'room-101' },
        query: { date: '2024-06-15' },
      })
      const res = mockRes()

      await checkAvailability(req, res)

      expect(res.json).toHaveBeenCalled()
      const slots = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(Array.isArray(slots)).toBe(true)
      expect(slots.length).toBeGreaterThan(0)

      // Slot at 10:00 should be unavailable
      const tenAmSlot = slots.find(
        (s: { startTime: string }) => new Date(s.startTime).getUTCHours() === 10,
      )
      expect(tenAmSlot?.available).toBe(false)

      // Slot at 8:00 should be available
      const eightAmSlot = slots.find(
        (s: { startTime: string }) => new Date(s.startTime).getUTCHours() === 8,
      )
      expect(eightAmSlot?.available).toBe(true)
    })

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq({
        params: { resourceType: 'room', resourceId: 'room-101' },
        query: { date: '2024-06-15' },
      })
      const res = mockRes()

      await checkAvailability(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('book', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({
        body: {
          resourceType: 'room',
          resourceId: 'room-101',
          startTime: '2024-06-15T10:00:00Z',
          duration: 60,
        },
      })
      const res = mockRes({ locals: {} })

      await book(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when required fields are missing', async () => {
      const req = mockReq({ body: { resourceType: 'room' } })
      const res = mockRes()

      await book(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.fieldsRequired' }),
      )
    })

    it('should return 400 when duration is less than 1', async () => {
      const req = mockReq({
        body: {
          resourceType: 'room',
          resourceId: 'room-101',
          startTime: '2024-06-15T14:00:00Z',
          duration: 0,
        },
      })
      const res = mockRes()

      await book(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.invalidDuration' }),
      )
    })

    it('should return 409 when slot is already booked', async () => {
      mockFindMany.mockResolvedValueOnce([BOOKING_ROW]) // conflict

      const req = mockReq({
        body: {
          resourceType: 'room',
          resourceId: 'room-101',
          startTime: '2024-06-15T10:00:00.000Z',
          duration: 60,
        },
      })
      const res = mockRes()

      await book(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.conflict' }),
      )
    })

    it('should create a booking when slot is available', async () => {
      mockFindMany.mockResolvedValueOnce([]) // no conflicts
      mockCreate.mockResolvedValueOnce({
        data: {
          ...BOOKING_ROW,
          startTime: '2024-06-15T14:00:00.000Z',
          endTime: '2024-06-15T15:00:00.000Z',
        },
      })

      const req = mockReq({
        body: {
          resourceType: 'room',
          resourceId: 'room-101',
          startTime: '2024-06-15T14:00:00.000Z',
          duration: 60,
        },
      })
      const res = mockRes()

      await book(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCreate).toHaveBeenCalledWith(
        'bookings',
        expect.objectContaining({
          userId: 'user-1',
          resourceType: 'room',
          resourceId: 'room-101',
          status: 'pending',
        }),
      )
    })

    it('should ignore cancelled bookings when checking conflicts', async () => {
      mockFindMany.mockResolvedValueOnce([{ ...BOOKING_ROW, status: 'cancelled' }])
      mockCreate.mockResolvedValueOnce({ data: BOOKING_ROW })

      const req = mockReq({
        body: {
          resourceType: 'room',
          resourceId: 'room-101',
          startTime: '2024-06-15T10:00:00.000Z',
          duration: 60,
        },
      })
      const res = mockRes()

      await book(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq({
        body: {
          resourceType: 'room',
          resourceId: 'room-101',
          startTime: '2024-06-15T14:00:00Z',
          duration: 60,
        },
      })
      const res = mockRes()

      await book(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getBookings', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await getBookings(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return paginated bookings', async () => {
      mockCount.mockResolvedValueOnce(1)
      mockFindMany.mockResolvedValueOnce([BOOKING_ROW])

      const req = mockReq()
      const res = mockRes()

      await getBookings(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ id: 'booking-1' })],
          total: 1,
          page: 1,
          limit: 20,
        }),
      )
    })

    it('should support status filtering', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({ query: { status: 'confirmed' } })
      const res = mockRes()

      await getBookings(req, res)

      expect(mockCount).toHaveBeenCalledWith(
        'bookings',
        expect.arrayContaining([expect.objectContaining({ field: 'status', value: 'confirmed' })]),
      )
    })

    it('should return 500 on database error', async () => {
      mockCount.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await getBookings(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getById', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes({ locals: {} })

      await getById(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when booking not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await getById(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 403 when user does not own booking', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, userId: 'other-user' })

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await getById(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return booking when found and owned', async () => {
      mockFindById.mockResolvedValueOnce(BOOKING_ROW)

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await getById(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'booking-1',
          resourceType: 'room',
          status: 'pending',
        }),
      )
    })
  })

  describe('cancel', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes({ locals: {} })

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when booking not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 403 when user does not own booking', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, userId: 'other-user' })

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return 409 when booking cannot be cancelled', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, status: 'completed' })

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.cannotCancel' }),
      )
    })

    it('should cancel a pending booking', async () => {
      mockFindById.mockResolvedValueOnce(BOOKING_ROW)
      mockUpdateById.mockResolvedValueOnce({})

      const req = mockReq({ params: { id: 'booking-1' }, body: { reason: 'Changed plans' } })
      const res = mockRes()

      await cancel(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'bookings',
        'booking-1',
        expect.objectContaining({ status: 'cancelled' }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'booking-1',
          status: 'cancelled',
          metadata: expect.objectContaining({ cancellationReason: 'Changed plans' }),
        }),
      )
    })

    it('should cancel a confirmed booking', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, status: 'confirmed' })
      mockUpdateById.mockResolvedValueOnce({})

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await cancel(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
    })
  })

  describe('reschedule', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({
        params: { id: 'booking-1' },
        body: { startTime: '2024-06-16T10:00:00Z' },
      })
      const res = mockRes({ locals: {} })

      await reschedule(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when startTime is missing', async () => {
      const req = mockReq({ params: { id: 'booking-1' }, body: {} })
      const res = mockRes()

      await reschedule(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.startTimeRequired' }),
      )
    })

    it('should return 404 when booking not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({
        params: { id: 'missing' },
        body: { startTime: '2024-06-16T10:00:00Z' },
      })
      const res = mockRes()

      await reschedule(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 403 when user does not own booking', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, userId: 'other-user' })

      const req = mockReq({
        params: { id: 'booking-1' },
        body: { startTime: '2024-06-16T10:00:00Z' },
      })
      const res = mockRes()

      await reschedule(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return 409 when booking cannot be rescheduled', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, status: 'completed' })

      const req = mockReq({
        params: { id: 'booking-1' },
        body: { startTime: '2024-06-16T10:00:00Z' },
      })
      const res = mockRes()

      await reschedule(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.cannotReschedule' }),
      )
    })

    it('should return 409 when new slot has conflict', async () => {
      mockFindById.mockResolvedValueOnce(BOOKING_ROW)
      mockFindMany.mockResolvedValueOnce([
        {
          ...BOOKING_ROW,
          id: 'booking-2',
          startTime: '2024-06-16T10:00:00.000Z',
          endTime: '2024-06-16T11:00:00.000Z',
        },
      ])

      const req = mockReq({
        params: { id: 'booking-1' },
        body: { startTime: '2024-06-16T10:00:00.000Z' },
      })
      const res = mockRes()

      await reschedule(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.conflict' }),
      )
    })

    it('should reschedule successfully', async () => {
      mockFindById.mockResolvedValueOnce(BOOKING_ROW)
      mockFindMany.mockResolvedValueOnce([]) // no conflicts
      mockUpdateById.mockResolvedValueOnce({})

      const req = mockReq({
        params: { id: 'booking-1' },
        body: { startTime: '2024-06-16T14:00:00.000Z', duration: 90 },
      })
      const res = mockRes()

      await reschedule(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'bookings',
        'booking-1',
        expect.objectContaining({
          startTime: '2024-06-16T14:00:00.000Z',
          duration: 90,
        }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'booking-1',
          startTime: '2024-06-16T14:00:00.000Z',
          duration: 90,
        }),
      )
    })

    it('should keep existing duration when not specified', async () => {
      mockFindById.mockResolvedValueOnce(BOOKING_ROW) // duration: 60
      mockFindMany.mockResolvedValueOnce([])
      mockUpdateById.mockResolvedValueOnce({})

      const req = mockReq({
        params: { id: 'booking-1' },
        body: { startTime: '2024-06-16T14:00:00.000Z' },
      })
      const res = mockRes()

      await reschedule(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'bookings',
        'booking-1',
        expect.objectContaining({ duration: 60 }),
      )
    })
  })

  describe('confirm', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes({ locals: {} })

      await confirm(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when booking not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await confirm(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 409 when booking cannot be confirmed', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, status: 'completed' })

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await confirm(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.cannotConfirm' }),
      )
    })

    it('should confirm a pending booking', async () => {
      mockFindById.mockResolvedValueOnce(BOOKING_ROW) // status: 'pending'
      mockUpdateById.mockResolvedValueOnce({})

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await confirm(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'bookings',
        'booking-1',
        expect.objectContaining({ status: 'confirmed' }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'booking-1', status: 'confirmed' }),
      )
    })
  })

  describe('complete', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes({ locals: {} })

      await complete(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when booking not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await complete(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 409 when booking cannot be completed', async () => {
      mockFindById.mockResolvedValueOnce(BOOKING_ROW) // status: 'pending' — can't complete

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await complete(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'booking.error.cannotComplete' }),
      )
    })

    it('should complete a confirmed booking', async () => {
      mockFindById.mockResolvedValueOnce({ ...BOOKING_ROW, status: 'confirmed' })
      mockUpdateById.mockResolvedValueOnce({})

      const req = mockReq({ params: { id: 'booking-1' } })
      const res = mockRes()

      await complete(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'bookings',
        'booking-1',
        expect.objectContaining({ status: 'completed' }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'booking-1', status: 'completed' }),
      )
    })
  })
})
