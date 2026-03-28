# @molecule/api-resource-booking

Booking/reservation resource for molecule.dev.

Provides availability checking, booking creation, lifecycle management
(confirm, cancel, complete), rescheduling, and resource-scoped queries.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-booking
```

## Usage

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-booking'
```

## API

### Interfaces

#### `Booking`

A booking/reservation.

```typescript
interface Booking {
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
```

#### `BookingQuery`

Options for querying bookings.

```typescript
interface BookingQuery {
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
```

#### `BookingRow`

Internal database row for a booking.

```typescript
interface BookingRow {
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
```

#### `CancelBookingInput`

Input for cancelling a booking.

```typescript
interface CancelBookingInput {
  /** Optional cancellation reason. */
  reason?: string
}
```

#### `CreateBookingInput`

Input for creating a booking.

```typescript
interface CreateBookingInput {
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
```

#### `PaginatedResult`

A paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The page of results. */
  data: T[]
  /** Total number of matching records. */
  total: number
  /** Current page number. */
  page: number
  /** Page size. */
  limit: number
}
```

#### `RescheduleBookingInput`

Input for rescheduling a booking.

```typescript
interface RescheduleBookingInput {
  /** New start time (ISO 8601). */
  startTime: string
  /** New duration in minutes (optional, keeps existing if omitted). */
  duration?: number
}
```

#### `TimeSlot`

An available time slot.

```typescript
interface TimeSlot {
  /** Start time of the slot. */
  startTime: string
  /** End time of the slot. */
  endTime: string
  /** Whether the slot is available. */
  available: boolean
}
```

### Types

#### `BookingStatus`

Possible statuses for a booking lifecycle.

```typescript
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
```

### Functions

#### `book(req, res)`

Creates a new booking for the authenticated user.
Validates no conflicting bookings exist for the requested time slot.

```typescript
function book(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with {@link CreateBookingInput} body.
- `res` — The response object.

#### `cancel(req, res)`

Cancels a booking. Only the booking owner can cancel, and only from valid states.

```typescript
function cancel(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id` and optional {@link CancelBookingInput} body.
- `res` — The response object.

#### `checkAvailability(req, res)`

Checks availability for a resource on a given date.
Returns hourly time slots with availability status based on existing bookings.

```typescript
function checkAvailability(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.resourceType`, `params.resourceId`, and query `date` and optional `duration`.
- `res` — The response object.

#### `complete(req, res)`

Marks a confirmed booking as completed.

```typescript
function complete(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id`.
- `res` — The response object.

#### `computeEndTime(startTime, durationMinutes)`

Computes the end time given a start time and duration in minutes.

```typescript
function computeEndTime(startTime: string, durationMinutes: number): string
```

- `startTime` — ISO 8601 start time string.
- `durationMinutes` — Duration in minutes.

**Returns:** ISO 8601 end time string.

#### `confirm(req, res)`

Confirms a pending booking.

```typescript
function confirm(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id`.
- `res` — The response object.

#### `generateTimeSlots(date, durationMinutes, existingBookings)`

Generates hourly time slots for a given date and checks availability against existing bookings.

```typescript
function generateTimeSlots(date: string, durationMinutes: number, existingBookings: BookingRow[]): TimeSlot[]
```

- `date` — The date to generate slots for (ISO 8601).
- `durationMinutes` — Requested duration in minutes (default 60).
- `existingBookings` — Already-booked rows for the resource on that day.

**Returns:** An array of time slots with availability.

#### `getBookings(req, res)`

Lists bookings for the authenticated user with optional filtering and pagination.

```typescript
function getBookings(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional query params for status, from, to, page, limit.
- `res` — The response object.

#### `getById(req, res)`

Retrieves a single booking by ID. Only the booking owner can access it.

```typescript
function getById(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id`.
- `res` — The response object.

#### `reschedule(req, res)`

Reschedules a booking to a new time. Only the booking owner can reschedule,
and only pending or confirmed bookings can be rescheduled.

```typescript
function reschedule(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id` and {@link RescheduleBookingInput} body.
- `res` — The response object.

#### `toBooking(row)`

Converts a database booking row into a typed {@link Booking}.

```typescript
function toBooking(row: BookingRow): Booking
```

- `row` — The raw database row.

**Returns:** The deserialized booking.

### Constants

#### `BOOKING_STATUSES`

All valid booking statuses.

```typescript
const BOOKING_STATUSES: readonly BookingStatus[]
```

#### `i18nRegistered`

Whether i18n registration has been attempted.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map for the booking resource routes.

```typescript
const requestHandlerMap: { readonly checkAvailability: typeof checkAvailability; readonly book: typeof book; readonly getBookings: typeof getBookings; readonly getById: typeof getById; readonly cancel: typeof cancel; readonly reschedule: typeof reschedule; readonly confirm: typeof confirm; readonly complete: typeof complete; }
```

#### `routes`

Booking routes. Supports availability checking, CRUD, lifecycle transitions,
and resource-scoped listing.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/bookings/availability/:resourceType/:resourceId"; readonly handler: "checkAvailability"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/bookings"; readonly handler: "book"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/bookings"; readonly handler: "getBookings"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/bookings/:id"; readonly handler: "getById"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/bookings/:id/cancel"; readonly handler: "cancel"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/bookings/:id/reschedule"; readonly handler: "reschedule"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/bookings/:id/confirm"; readonly handler: "confirm"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/bookings/:id/complete"; readonly handler: "complete"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `STATUS_TRANSITIONS`

Allowed status transitions keyed by current status.

```typescript
const STATUS_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
