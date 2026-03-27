/**
 * Booking utility functions for converting database rows and computing time slots.
 *
 * @module
 */

import type { Booking, BookingRow, TimeSlot } from './types.js'

/**
 * Converts a database booking row into a typed {@link Booking}.
 * @param row - The raw database row.
 * @returns The deserialized booking.
 */
export function toBooking(row: BookingRow): Booking {
  const booking: Booking = {
    id: row.id,
    userId: row.userId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    status: row.status as Booking['status'],
    startTime: row.startTime,
    endTime: row.endTime,
    duration: row.duration,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  if (row.notes) booking.notes = row.notes
  if (row.metadata) {
    try {
      booking.metadata = JSON.parse(row.metadata) as Record<string, unknown>
    } catch {
      /* ignore malformed JSON */
    }
  }
  return booking
}

/**
 * Computes the end time given a start time and duration in minutes.
 * @param startTime - ISO 8601 start time string.
 * @param durationMinutes - Duration in minutes.
 * @returns ISO 8601 end time string.
 */
export function computeEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime)
  return new Date(start.getTime() + durationMinutes * 60_000).toISOString()
}

/**
 * Generates hourly time slots for a given date and checks availability against existing bookings.
 * @param date - The date to generate slots for (ISO 8601).
 * @param durationMinutes - Requested duration in minutes (default 60).
 * @param existingBookings - Already-booked rows for the resource on that day.
 * @returns An array of time slots with availability.
 */
export function generateTimeSlots(
  date: string,
  durationMinutes: number,
  existingBookings: BookingRow[],
): TimeSlot[] {
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)

  const slots: TimeSlot[] = []
  const slotDuration = durationMinutes > 0 ? durationMinutes : 60

  for (let hour = 8; hour < 20; hour++) {
    const slotStart = new Date(dayStart)
    slotStart.setUTCHours(hour, 0, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60_000)

    // A slot is unavailable if any active booking overlaps with it
    const overlaps = existingBookings.some((b) => {
      if (b.status === 'cancelled') return false
      const bStart = new Date(b.startTime).getTime()
      const bEnd = new Date(b.endTime).getTime()
      return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart
    })

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      available: !overlaps,
    })
  }

  return slots
}
