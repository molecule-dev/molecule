import { describe, expect, it } from 'vitest'

import type { BookingRow } from '../types.js'
import { computeEndTime, generateTimeSlots, toBooking } from '../utilities.js'

const BASE_ROW: BookingRow = {
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

describe('toBooking', () => {
  it('should convert a booking row to a Booking', () => {
    const booking = toBooking(BASE_ROW)

    expect(booking).toEqual({
      id: 'booking-1',
      userId: 'user-1',
      resourceType: 'room',
      resourceId: 'room-101',
      status: 'pending',
      startTime: '2024-06-15T10:00:00.000Z',
      endTime: '2024-06-15T11:00:00.000Z',
      duration: 60,
      createdAt: '2024-06-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    })
  })

  it('should include notes when present', () => {
    const booking = toBooking({ ...BASE_ROW, notes: 'VIP guest' })

    expect(booking.notes).toBe('VIP guest')
  })

  it('should parse metadata JSON', () => {
    const booking = toBooking({
      ...BASE_ROW,
      metadata: JSON.stringify({ attendees: 5 }),
    })

    expect(booking.metadata).toEqual({ attendees: 5 })
  })

  it('should ignore malformed metadata JSON', () => {
    const booking = toBooking({ ...BASE_ROW, metadata: 'not-json{' })

    expect(booking.metadata).toBeUndefined()
  })
})

describe('computeEndTime', () => {
  it('should add duration to start time', () => {
    const endTime = computeEndTime('2024-06-15T10:00:00.000Z', 60)

    expect(endTime).toBe('2024-06-15T11:00:00.000Z')
  })

  it('should handle durations crossing hours', () => {
    const endTime = computeEndTime('2024-06-15T10:30:00.000Z', 90)

    expect(endTime).toBe('2024-06-15T12:00:00.000Z')
  })

  it('should handle short durations', () => {
    const endTime = computeEndTime('2024-06-15T10:00:00.000Z', 15)

    expect(endTime).toBe('2024-06-15T10:15:00.000Z')
  })
})

describe('generateTimeSlots', () => {
  it('should generate hourly slots from 08:00 to 20:00', () => {
    const slots = generateTimeSlots('2024-06-15', 60, [])

    expect(slots).toHaveLength(12) // 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
    expect(slots.every((s) => s.available)).toBe(true)
  })

  it('should mark overlapping slots as unavailable', () => {
    const slots = generateTimeSlots('2024-06-15', 60, [BASE_ROW])

    const tenAmSlot = slots.find((s) => new Date(s.startTime).getUTCHours() === 10)
    expect(tenAmSlot?.available).toBe(false)

    const nineAmSlot = slots.find((s) => new Date(s.startTime).getUTCHours() === 9)
    expect(nineAmSlot?.available).toBe(true)
  })

  it('should ignore cancelled bookings', () => {
    const cancelledBooking: BookingRow = { ...BASE_ROW, status: 'cancelled' }
    const slots = generateTimeSlots('2024-06-15', 60, [cancelledBooking])

    expect(slots.every((s) => s.available)).toBe(true)
  })

  it('should handle custom duration', () => {
    const slots = generateTimeSlots('2024-06-15', 30, [])

    expect(slots).toHaveLength(12)
    // Each slot should have 30 min duration
    const first = slots[0]
    const diffMs = new Date(first.endTime).getTime() - new Date(first.startTime).getTime()
    expect(diffMs).toBe(30 * 60_000)
  })
})
