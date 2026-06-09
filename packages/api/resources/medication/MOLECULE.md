# @molecule/api-resource-medication

`@molecule/api-resource-medication` — medication tracking with
dosing schedule + adherence log + adherence-rate calc.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-medication
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
