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
  setAvailabilityRulesForUser,
  generateSlots,
} from '@molecule/api-resource-event-type'

await setAvailabilityRulesForUser(userId, [
  { day_of_week: 1, start_minute: 540, end_minute: 1020, timezone: 'America/New_York' },
])
await createEventTypeForOwner(userId, {
  name: '30-min consult',
  slug: '30-min',
  duration_minutes: 30,
})
const slots = generateSlots({ date: '2026-06-15', durationMinutes: 30, rules })
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-event-type
```

## API

### Interfaces

#### `AvailabilityRuleRow`

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

```typescript
interface AvailabilitySlot {
  start: string // ISO datetime
  end: string
  available: boolean
}
```

#### `EventTypeRow`

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

```typescript
type LocationKind = 'video' | 'phone' | 'in_person' | 'custom'
```

### Functions

#### `createEventTypeForOwner(ownerId, data)`

```typescript
function createEventTypeForOwner(ownerId: string, data: { name: string; slug: string; description?: string | null; duration_minutes?: number; location_kind?: LocationKind; location_value?: unknown; buffer_before_minutes?: number; buffer_after_minutes?: number; min_notice_minutes?: number; max_per_day?: number | null; requires_confirmation?: boolean; color?: string | null; is_active?: boolean; position?: number; }): Promise<EventTypeRow>
```

#### `createEventTypeRouter()`

```typescript
function createEventTypeRouter(): Router
```

#### `deleteEventTypeForOwner(eventTypeId, ownerId)`

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

```typescript
function getEventTypeBySlug(slug: string): Promise<EventTypeRow | null>
```

#### `getEventTypeForOwner(eventTypeId, ownerId)`

```typescript
function getEventTypeForOwner(eventTypeId: string, ownerId: string): Promise<EventTypeRow | null>
```

#### `listAvailabilityRulesForUser(userId)`

```typescript
function listAvailabilityRulesForUser(userId: string): Promise<AvailabilityRuleRow[]>
```

#### `listEventTypesForOwner(ownerId, opts?)`

```typescript
function listEventTypesForOwner(ownerId: string, opts?: { include_inactive?: boolean; }): Promise<EventTypeRow[]>
```

#### `setAvailabilityRulesForUser(userId, rules)`

```typescript
function setAvailabilityRulesForUser(userId: string, rules: { day_of_week: number; start_minute: number; end_minute: number; timezone: string; }[]): Promise<AvailabilityRuleRow[]>
```

#### `updateEventTypeForOwner(eventTypeId, ownerId, patch)`

```typescript
function updateEventTypeForOwner(eventTypeId: string, ownerId: string, patch: Partial<EventTypeRow>): Promise<EventTypeRow | null>
```

### Constants

#### `availabilityQuerySchema`

```typescript
const availabilityQuerySchema: z.ZodObject<{ date: z.ZodString; }, "strip", z.ZodTypeAny, { date: string; }, { date: string; }>
```

#### `availabilityRuleSchema`

```typescript
const availabilityRuleSchema: z.ZodObject<{ day_of_week: z.ZodNumber; start_minute: z.ZodNumber; end_minute: z.ZodNumber; timezone: z.ZodString; }, "strip", z.ZodTypeAny, { day_of_week: number; start_minute: number; end_minute: number; timezone: string; }, { day_of_week: number; start_minute: number; end_minute: number; timezone: string; }>
```

#### `eventTypeCreateSchema`

```typescript
const eventTypeCreateSchema: z.ZodObject<{ name: z.ZodString; slug: z.ZodString; description: z.ZodOptional<z.ZodNullable<z.ZodString>>; duration_minutes: z.ZodOptional<z.ZodNumber>; location_kind: z.ZodOptional<z.ZodEnum<["video", "phone", "in_person", "custom"]>>; location_value: z.ZodOptional<z.ZodUnknown>; buffer_before_minutes: z.ZodOptional<z.ZodNumber>; buffer_after_minutes: z.ZodOptional<z.ZodNumber>; min_notice_minutes: z.ZodOptional<z.ZodNumber>; max_per_day: z.ZodOptional<z.ZodNullable<z.ZodNumber>>; requires_confirmation: z.ZodOptional<z.ZodBoolean>; color: z.ZodOptional<z.ZodNullable<z.ZodString>>; is_active: z.ZodOptional<z.ZodBoolean>; position: z.ZodOptional<z.ZodNumber>; }, "strip", z.ZodTypeAny, { name: string; slug: string; description?: string | null | undefined; duration_minutes?: number | undefined; location_kind?: "video" | "phone" | "in_person" | "custom" | undefined; location_value?: unknown; buffer_before_minutes?: number | undefined; buffer_after_minutes?: number | undefined; min_notice_minutes?: number | undefined; max_per_day?: number | null | undefined; requires_confirmation?: boolean | undefined; color?: string | null | undefined; is_active?: boolean | undefined; position?: number | undefined; }, { name: string; slug: string; description?: string | null | undefined; duration_minutes?: number | undefined; location_kind?: "video" | "phone" | "in_person" | "custom" | undefined; location_value?: unknown; buffer_before_minutes?: number | undefined; buffer_after_minutes?: number | undefined; min_notice_minutes?: number | undefined; max_per_day?: number | null | undefined; requires_confirmation?: boolean | undefined; color?: string | null | undefined; is_active?: boolean | undefined; position?: number | undefined; }>
```

#### `eventTypeUpdateSchema`

```typescript
const eventTypeUpdateSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; slug: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; duration_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; location_kind: z.ZodOptional<z.ZodOptional<z.ZodEnum<["video", "phone", "in_person", "custom"]>>>; location_value: z.ZodOptional<z.ZodOptional<z.ZodUnknown>>; buffer_before_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; buffer_after_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; min_notice_minutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; max_per_day: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>; requires_confirmation: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; color: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; is_active: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; position: z.ZodOptional<z.ZodOptional<z.ZodNumber>>; }, "strip", z.ZodTypeAny, { name?: string | undefined; slug?: string | undefined; description?: string | null | undefined; duration_minutes?: number | undefined; location_kind?: "video" | "phone" | "in_person" | "custom" | undefined; location_value?: unknown; buffer_before_minutes?: number | undefined; buffer_after_minutes?: number | undefined; min_notice_minutes?: number | undefined; max_per_day?: number | null | undefined; requires_confirmation?: boolean | undefined; color?: string | null | undefined; is_active?: boolean | undefined; position?: number | undefined; }, { name?: string | undefined; slug?: string | undefined; description?: string | null | undefined; duration_minutes?: number | undefined; location_kind?: "video" | "phone" | "in_person" | "custom" | undefined; location_value?: unknown; buffer_before_minutes?: number | undefined; buffer_after_minutes?: number | undefined; min_notice_minutes?: number | undefined; max_per_day?: number | null | undefined; requires_confirmation?: boolean | undefined; color?: string | null | undefined; is_active?: boolean | undefined; position?: number | undefined; }>
```

#### `LOCATION_KINDS`

```typescript
const LOCATION_KINDS: readonly ["video", "phone", "in_person", "custom"]
```

#### `slugRegex`

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
