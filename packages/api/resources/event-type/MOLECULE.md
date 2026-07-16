# @molecule/api-resource-event-type

`@molecule/api-resource-event-type` — Calendly-style event-types +
weekly availability rules + slot generation.

Extracted from the meeting-scheduler flagship.

## Quick Start

```ts
import { createEventTypeRouter } from '@molecule/api-resource-event-type'
app.use('/event-types', createEventTypeRouter())
```

```ts
import {
  createEventTypeForOwner,
  generateSlots,
  listAvailabilityRulesForUser,
  setAvailabilityRulesForUser,
} from '@molecule/api-resource-event-type'

await setAvailabilityRulesForUser(userId, [
  { day_of_week: 1, start_minute: 540, end_minute: 1020, timezone: 'America/New_York' },
])
await createEventTypeForOwner(userId, {
  name: '30-min consult',
  slug: '30-min',
  duration_minutes: 30,
})
const rules = await listAvailabilityRulesForUser(userId)
const slots = generateSlots({ date: '2026-06-15', durationMinutes: 30, rules })
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-event-type @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `AvailabilityRuleRow`

Database row shape for a recurring weekly availability rule belonging to a user.

```typescript
interface AvailabilityRuleRow {
  id: string
  user_id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  start_minute: number // minutes since midnight, local time
  end_minute: number
  timezone: string
  created_at: string | Date
}
```

#### `AvailabilitySlot`

A discrete time window indicating whether a booking slot is open or blocked.

```typescript
interface AvailabilitySlot {
  start: string // ISO datetime
  end: string
  available: boolean
}
```

#### `EventTypeRow`

Database row shape for a bookable event type owned by a user.

```typescript
interface EventTypeRow {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  location_kind: LocationKind
  location_value: unknown
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_minutes: number
  max_per_day: number | null
  requires_confirmation: boolean
  color: string | null
  is_active: boolean
  position: number
  created_at: string | Date
  updated_at: string | Date
}
```

### Types

#### `LocationKind`

The medium through which an event type meeting takes place.

```typescript
type LocationKind = 'video' | 'phone' | 'in_person' | 'custom'
```

### Functions

#### `createEventTypeForOwner(ownerId, data)`

Create a new event type for the given owner with the supplied configuration.

```typescript
function createEventTypeForOwner(ownerId: string, data: { name: string; slug: string; description?: string | null; duration_minutes?: number; location_kind?: LocationKind; location_value?: unknown; buffer_before_minutes?: number; buffer_after_minutes?: number; min_notice_minutes?: number; max_per_day?: number | null; requires_confirmation?: boolean; color?: string | null; is_active?: boolean; position?: number; }): Promise<EventTypeRow>
```

#### `createEventTypeRouter()`

Creates and returns the Express router for event-type and availability endpoints.

```typescript
function createEventTypeRouter(): Router
```

#### `deleteEventTypeForOwner(eventTypeId, ownerId)`

Delete an event type by ID, returning false if it does not belong to the given owner.

```typescript
function deleteEventTypeForOwner(eventTypeId: string, ownerId: string): Promise<boolean>
```

#### `generateSlots(opts)`

Generate available slots for a given date based on the user's
availability rules + event-type duration + buffers.

Caller is responsible for filtering against existing bookings.

```typescript
function generateSlots(opts: { date: string; durationMinutes: number; bufferBeforeMinutes?: number; bufferAfterMinutes?: number; rules: Pick<AvailabilityRuleRow, "day_of_week" | "start_minute" | "end_minute">[]; }): AvailabilitySlot[]
```

#### `getEventTypeBySlug(slug)`

Look up an active event type by its URL slug.

```typescript
function getEventTypeBySlug(slug: string): Promise<EventTypeRow | null>
```

#### `getEventTypeForOwner(eventTypeId, ownerId)`

Fetch a single event type by ID, returning null if it does not belong to the given owner.

```typescript
function getEventTypeForOwner(eventTypeId: string, ownerId: string): Promise<EventTypeRow | null>
```

#### `listAvailabilityRulesForUser(userId)`

Return all availability rules for the given user, ordered by day and start time.

```typescript
function listAvailabilityRulesForUser(userId: string): Promise<AvailabilityRuleRow[]>
```

#### `listEventTypesForOwner(ownerId, opts?)`

List all event types owned by the given user, optionally including inactive ones.

```typescript
function listEventTypesForOwner(ownerId: string, opts?: { include_inactive?: boolean; }): Promise<EventTypeRow[]>
```

#### `setAvailabilityRulesForUser(userId, rules)`

Replace all availability rules for the given user with the supplied set.

```typescript
function setAvailabilityRulesForUser(userId: string, rules: { day_of_week: number; start_minute: number; end_minute: number; timezone: string; }[]): Promise<AvailabilityRuleRow[]>
```

#### `updateEventTypeForOwner(eventTypeId, ownerId, patch)`

Apply a partial patch to an event type, returning null if the record does not belong to the owner.

```typescript
function updateEventTypeForOwner(eventTypeId: string, ownerId: string, patch: Partial<EventTypeRow>): Promise<EventTypeRow | null>
```

### Constants

#### `availabilityQuerySchema`

Zod schema for the query parameters when fetching availability slots (requires a YYYY-MM-DD date).

```typescript
const availabilityQuerySchema: z.ZodObject<{ date: z.ZodString; }, z.core.$strip>
```

#### `availabilityRuleSchema`

Zod schema for a single availability rule defining a recurring weekly time block.

```typescript
const availabilityRuleSchema: z.ZodObject<{ day_of_week: z.ZodNumber; start_minute: z.ZodNumber; end_minute: z.ZodNumber; timezone: z.ZodString; }, z.core.$strip>
```

#### `eventTypeCreateSchema`

Zod schema for validating the request body when creating a new event type.

```typescript
const eventTypeCreateSchema: z.ZodObject<{ name: z.ZodString; slug: z.ZodString; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; duration_minutes: z.ZodOptional<z.ZodNumber>; location_kind: z.ZodOptional<z.ZodEnum<{ video: "video"; phone: "phone"; in_person: "in_person"; custom: "custom"; }>>; location_value: z.ZodOptional<z.ZodUnknown>; buffer_before_minutes: z.ZodOptional<z.ZodNumber>; buffer_after_minutes: z.ZodOptional<z.ZodNumber>; min_notice_minutes: z.ZodOptional<z.ZodNumber>; max_per_day: z.ZodOptional<z.ZodNullable<z.ZodNumber>>; requires_confirmation: z.ZodOptional<z.ZodBoolean>; color: z.ZodOptional<z.ZodNullable<z.ZodString>>; is_active: z.ZodOptional<z.ZodBoolean>; position: z.ZodOptional<z.ZodNumber>; }, z.core.$strip>
```

#### `eventTypeUpdateSchema`

Zod schema for validating the request body when updating an existing event type (all fields optional).

```typescript
const eventTypeUpdateSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; slug: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; duration_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; location_kind: z.ZodOptional<z.ZodOptional<z.ZodEnum<{ video: "video"; phone: "phone"; in_person: "in_person"; custom: "custom"; }>>>; location_value: z.ZodOptional<z.ZodOptional<z.ZodUnknown>>; buffer_before_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; buffer_after_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; min_notice_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; max_per_day: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>; requires_confirmation: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; color: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; is_active: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; position: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; }, z.core.$strip>
```

#### `LOCATION_KINDS`

Allowed location kinds for an event type.

```typescript
const LOCATION_KINDS: readonly ["video", "phone", "in_person", "custom"]
```

#### `slugRegex`

Regex that validates a lowercase kebab-case slug (no leading/trailing hyphens).

```typescript
const slugRegex: RegExp
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

- **Migration required.** `src/__setup__/event_types.sql` ships with this
  package (tables `event_types`, `availability_rules`) and must exist in the
  target database before use (scaffolded apps apply it automatically).
- **Mounting differs from sibling resources:** this package exports an Express
  `Router` FACTORY — `app.use('/event-types', createEventTypeRouter())` — not a
  declarative `routes` array + `requestHandlerMap`. It requires the Express
  default bonds (`requireUser`/`getParamId` from
  `@molecule/api-bonds-default-express`) to be wired.
- **The by-slug routes are PUBLIC by design** (`GET /by-slug/:slug` and
  `…/availability?date=YYYY-MM-DD` power the public booking page — no auth,
  no owner data beyond the published event type). Everything else is
  owner-scoped via the session; never accept an owner id from the client.
- **`generateSlots()` is timezone-naive and booking-blind.** It matches rules
  by the UTC day-of-week of `date` and returns minute-of-day slots straight
  from the rules — the stored `timezone` is NOT applied, and existing bookings
  are NOT subtracted. Convert for display in the app, and filter taken slots
  against your booking/meeting store before offering them.
