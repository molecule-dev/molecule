/**
 * Booking types.
 *
 * @module
 */

/**
 * Possible statuses for a booking lifecycle.
 */
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'

/**
 * All valid booking statuses.
 */
export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no-show',
] as const

/**
 * Allowed status transitions keyed by current status.
 */
export const STATUS_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'completed', 'no-show'],
  cancelled: [],
  completed: [],
  'no-show': [],
}

/**
 * A booking/reservation.
 */
export interface Booking {
  /** Unique booking identifier. */
  id: string
  /** The user who created this booking. */
  userId: string
  /** The type of resource being booked (e.g., 'room', 'appointment'). */
  resourceType: string
  /** The specific resource identifier. */
  resourceId: string
  /** Current booking status. */
  status: BookingStatus
  /** Start time of the booking. */
  startTime: string
  /** End time of the booking. */
  endTime: string
  /** Duration in minutes. */
  duration: number
  /** Optional notes. */
  notes?: string
  /** Arbitrary metadata attached to this booking. */
  metadata?: Record<string, unknown>
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}

/**
 * Input for creating a booking.
 */
export interface CreateBookingInput {
  /** The type of resource being booked. */
  resourceType: string
  /** The specific resource identifier. */
  resourceId: string
  /** Start time of the booking (ISO 8601). */
  startTime: string
  /** Duration in minutes. */
  duration: number
  /** Optional notes. */
  notes?: string
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>
}

/**
 * Input for rescheduling a booking.
 */
export interface RescheduleBookingInput {
  /** New start time (ISO 8601). */
  startTime: string
  /** New duration in minutes (optional, keeps existing if omitted). */
  duration?: number
}

/**
 * Input for cancelling a booking.
 */
export interface CancelBookingInput {
  /** Optional cancellation reason. */
  reason?: string
}

/**
 * An available time slot.
 */
export interface TimeSlot {
  /** Start time of the slot. */
  startTime: string
  /** End time of the slot. */
  endTime: string
  /** Whether the slot is available. */
  available: boolean
}

/**
 * Options for querying bookings.
 */
export interface BookingQuery {
  /** Filter by status. */
  status?: BookingStatus
  /** Return only bookings starting after this date. */
  from?: string
  /** Return only bookings starting before this date. */
  to?: string
  /** Page number (1-based). */
  page?: number
  /** Items per page. */
  limit?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** The page of results. */
  data: T[]
  /** Total number of matching records. */
  total: number
  /** Current page number. */
  page: number
  /** Page size. */
  limit: number
}

/**
 * Internal database row for a booking.
 */
export interface BookingRow {
  /** Unique booking identifier. */
  id: string
  /** The user who created this booking. */
  userId: string
  /** The type of resource being booked. */
  resourceType: string
  /** The specific resource identifier. */
  resourceId: string
  /** Current booking status. */
  status: string
  /** Start time of the booking. */
  startTime: string
  /** End time of the booking. */
  endTime: string
  /** Duration in minutes. */
  duration: number
  /** Optional notes. */
  notes: string | null
  /** JSON-serialized metadata. */
  metadata: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
