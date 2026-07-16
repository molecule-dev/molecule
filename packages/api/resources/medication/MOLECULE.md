# @molecule/api-resource-medication

`@molecule/api-resource-medication` — medication tracking with
dosing schedule + adherence log + adherence-rate calc.

Owner-scoped: every medication and dose log belongs to the authenticated
user. Medications carry dosage, `frequency` (e.g. `daily`, `twice_daily`),
`times_of_day`, and active date range; dose logs record
taken/skipped/late/missed and `adherenceRate` aggregates them over a date
range.

## Quick Start

```ts
import { createMedicationRouter } from '@molecule/api-resource-medication'
app.use('/medications', createMedicationRouter())
// GET / · POST / · GET /adherence?from=…&to=… · GET|PUT|DELETE /:id
// GET /:id/logs · POST /:id/logs
```

```ts
import {
  adherenceRate,
  createMedicationForOwner,
  logDose,
} from '@molecule/api-resource-medication'

const med = await createMedicationForOwner(userId, {
  name: 'Metformin',
  dosage: '500 mg',
  frequency: 'twice_daily',
})
await logDose(med.id, userId, { status: 'taken' })
const { rate } = await adherenceRate(userId, '2026-01-01', '2026-01-31')
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-medication @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `MedicationLogRow`

Database row shape for a medication intake log entry.

```typescript
interface MedicationLogRow {
  id: string
  medication_id: string
  owner_id: string
  taken_at: string | Date
  status: 'taken' | 'skipped' | 'late' | 'missed'
  notes: string | null
  created_at: string | Date
}
```

#### `MedicationRow`

Database row shape for a medication record.

```typescript
interface MedicationRow {
  id: string
  owner_id: string
  name: string
  generic_name: string | null
  dosage: string
  unit: string | null
  frequency: MedicationFrequency
  times_of_day: string[]
  start_date: string | Date | null
  end_date: string | Date | null
  notes: string | null
  is_active: boolean
  created_at: string | Date
  updated_at: string | Date
}
```

### Types

#### `MedicationFrequency`

Describes how often a medication is taken (e.g. daily, twice daily, as needed).

```typescript
type MedicationFrequency =
  | 'once'
  | 'daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'as_needed'
  | 'weekly'
  | 'custom'
```

### Functions

#### `adherenceRate(ownerId, from, to)`

Adherence summary: percentage of `taken` logs out of all logs in window.

```typescript
function adherenceRate(ownerId: string, from: string, to: string): Promise<{ taken: number; total: number; rate: number; }>
```

#### `createMedicationForOwner(ownerId, data)`

Creates a new medication record owned by the given owner and returns the persisted row.

```typescript
function createMedicationForOwner(ownerId: string, data: { name: string; generic_name?: string | null; dosage: string; unit?: string | null; frequency?: MedicationFrequency; times_of_day?: string[]; start_date?: string | null; end_date?: string | null; notes?: string | null; }): Promise<MedicationRow>
```

#### `createMedicationRouter()`

Creates and returns the Express router for medication CRUD and dose-logging endpoints.

```typescript
function createMedicationRouter(): Router
```

#### `deleteMedicationForOwner(medicationId, ownerId)`

Deletes a medication by ID, returning true on success or false if not found or not owned.

```typescript
function deleteMedicationForOwner(medicationId: string, ownerId: string): Promise<boolean>
```

#### `getMedicationForOwner(medicationId, ownerId)`

Fetches a single medication by ID, returning null if not found or not owned by the given owner.

```typescript
function getMedicationForOwner(medicationId: string, ownerId: string): Promise<MedicationRow | null>
```

#### `listLogs(medicationId, ownerId, opts?)`

Returns dose logs for a medication within an optional time window, or null if the medication is not found or not owned.

```typescript
function listLogs(medicationId: string, ownerId: string, opts?: { from?: string; to?: string; limit?: number; }): Promise<MedicationLogRow[] | null>
```

#### `listMedicationsForOwner(ownerId, opts?)`

Returns all medications belonging to the given owner, optionally including inactive ones.

```typescript
function listMedicationsForOwner(ownerId: string, opts?: { include_inactive?: boolean; }): Promise<MedicationRow[]>
```

#### `logDose(medicationId, ownerId, data)`

Log a dose. If `status` not provided, infers from `taken_at` vs scheduled times.

```typescript
function logDose(medicationId: string, ownerId: string, data: { taken_at?: string; status?: "taken" | "skipped" | "late" | "missed"; notes?: string | null; }): Promise<MedicationLogRow | null>
```

#### `updateMedicationForOwner(medicationId, ownerId, patch)`

Applies a partial patch to a medication, returning the updated row or null if not found or not owned.

```typescript
function updateMedicationForOwner(medicationId: string, ownerId: string, patch: Partial<MedicationRow>): Promise<MedicationRow | null>
```

### Constants

#### `LOG_STATUSES`

Valid status values for a medication dose log entry.

```typescript
const LOG_STATUSES: readonly ["taken", "skipped", "late", "missed"]
```

#### `logCreateSchema`

Zod schema for validating medication dose log creation request payloads.

```typescript
const logCreateSchema: z.ZodObject<{ taken_at: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<{ taken: "taken"; skipped: "skipped"; late: "late"; missed: "missed"; }>>; notes: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `MEDICATION_FREQUENCIES`

Valid dosing frequency options for a medication schedule.

```typescript
const MEDICATION_FREQUENCIES: readonly ["once", "daily", "twice_daily", "three_times_daily", "four_times_daily", "as_needed", "weekly", "custom"]
```

#### `medicationCreateSchema`

Zod schema for validating medication creation request payloads.

```typescript
const medicationCreateSchema: z.ZodObject<{ name: z.ZodString; generic_name: z.ZodOptional<z.ZodNullable<z.ZodString>>; dosage: z.ZodString; unit: z.ZodOptional<z.ZodNullable<z.ZodString>>; frequency: z.ZodOptional<z.ZodEnum<{ once: "once"; daily: "daily"; twice_daily: "twice_daily"; three_times_daily: "three_times_daily"; four_times_daily: "four_times_daily"; as_needed: "as_needed"; weekly: "weekly"; custom: "custom"; }>>; times_of_day: z.ZodOptional<z.ZodArray<z.ZodString>>; start_date: z.ZodOptional<z.ZodNullable<z.ZodString>>; end_date: z.ZodOptional<z.ZodNullable<z.ZodString>>; notes: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `medicationUpdateSchema`

Zod schema for validating medication update request payloads; all create fields become optional and `is_active` is added.

```typescript
const medicationUpdateSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; generic_name: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; dosage: z.ZodOptional<z.ZodString>; unit: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; frequency: z.ZodOptional<z.ZodOptional<z.ZodEnum<{ once: "once"; daily: "daily"; twice_daily: "twice_daily"; three_times_daily: "three_times_daily"; four_times_daily: "four_times_daily"; as_needed: "as_needed"; weekly: "weekly"; custom: "custom"; }>>>; times_of_day: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>; start_date: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; end_date: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; notes: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>; is_active: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
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

Tables: `src/__setup__/medications.sql` creates `medications` +
`medication_logs`. An mlcl-scaffolded API replays `__setup__/*.sql`
automatically on migrate; anywhere else run it once — nothing at runtime
creates them.

The router does not authenticate — it reads the caller from
`res.locals.session` (populated by your global auth middleware) and 401s
without a session. All service functions are `…ForOwner(…, ownerId)` and
return `null` for rows the caller doesn't own — always pass the
AUTHENTICATED user's id, never a client-sent one.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one by
one. This is HEALTH data: a box you can't check is a correctness or privacy
bug to fix, never a skip:
- [ ] Adding a medication persists its real fields — `name`, `dosage`,
  `frequency`, `times_of_day` — and the med then appears in the user's list
  (`GET /`) carrying those exact values, not a truncated or defaulted copy.
- [ ] The schedule matches the frequency: a `twice_daily` med carries two
  `times_of_day` entries and the UI shows two dose slots for the day — not one
  and not three; a `daily` med shows exactly one. (Nothing derives the times
  from `frequency` automatically, so a mismatch is a real bug to catch here.)
- [ ] Logging a dose records it against the right medication and time:
  `POST /:id/logs` with `status: 'taken'` (and its `taken_at`) then shows in
  `GET /:id/logs`, and the adherence figure (`GET /adherence`) moves.
- [ ] A skipped or missed dose is reflected HONESTLY — logged with
  `status: 'missed'`/`'skipped'` it counts toward `total` but NOT `taken`, so
  it lowers the adherence rate; it is never silently counted as taken (the
  default status is `taken`, so a miss must be logged as a miss, not omitted).
- [ ] CORRECTNESS — adherence is a true ratio of logged doses: a brand-new
  med with zero logged doses reads 0% (`rate` 0, `total` 0), never 100%; a
  partial day (some doses logged, some not yet) is never shown as complete.
- [ ] If the app tracks refills/supply on top of this resource (the core does
  not model one), recording a fill decrements the refills-remaining count and
  a low-supply threshold raises a visible refill flag — verify both live.
- [ ] PRIVACY/AUTHORIZATION — medication data is strictly per-user: signed in
  as user B, guessing user A's medication id on `GET /:id`, `PUT /:id`,
  `DELETE /:id`, or `/:id/logs` returns 404 (owner-scoped), never A's row; an
  unauthenticated request 401s. Confirm PHI (name, dosage, notes) is never
  written to server logs in the clear.
