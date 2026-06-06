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

```typescript
function createMedicationForOwner(ownerId: string, data: { name: string; generic_name?: string | null; dosage: string; unit?: string | null; frequency?: MedicationFrequency; times_of_day?: string[]; start_date?: string | null; end_date?: string | null; notes?: string | null; }): Promise<MedicationRow>
```

#### `createMedicationRouter()`

```typescript
function createMedicationRouter(): Router
```

#### `deleteMedicationForOwner(medicationId, ownerId)`

```typescript
function deleteMedicationForOwner(medicationId: string, ownerId: string): Promise<boolean>
```

#### `getMedicationForOwner(medicationId, ownerId)`

```typescript
function getMedicationForOwner(medicationId: string, ownerId: string): Promise<MedicationRow | null>
```

#### `listLogs(medicationId, ownerId, opts?)`

```typescript
function listLogs(medicationId: string, ownerId: string, opts?: { from?: string; to?: string; limit?: number; }): Promise<MedicationLogRow[] | null>
```

#### `listMedicationsForOwner(ownerId, opts?)`

```typescript
function listMedicationsForOwner(ownerId: string, opts?: { include_inactive?: boolean; }): Promise<MedicationRow[]>
```

#### `logDose(medicationId, ownerId, data)`

Log a dose. If `status` not provided, infers from `taken_at` vs scheduled times.

```typescript
function logDose(medicationId: string, ownerId: string, data: { taken_at?: string; status?: "taken" | "skipped" | "late" | "missed"; notes?: string | null; }): Promise<MedicationLogRow | null>
```

#### `updateMedicationForOwner(medicationId, ownerId, patch)`

```typescript
function updateMedicationForOwner(medicationId: string, ownerId: string, patch: Partial<MedicationRow>): Promise<MedicationRow | null>
```

### Constants

#### `LOG_STATUSES`

```typescript
const LOG_STATUSES: readonly ["taken", "skipped", "late", "missed"]
```

#### `logCreateSchema`

```typescript
const logCreateSchema: z.ZodObject<{ taken_at: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<{ taken: "taken"; skipped: "skipped"; late: "late"; missed: "missed"; }>>; notes: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `MEDICATION_FREQUENCIES`

```typescript
const MEDICATION_FREQUENCIES: readonly ["once", "daily", "twice_daily", "three_times_daily", "four_times_daily", "as_needed", "weekly", "custom"]
```

#### `medicationCreateSchema`

```typescript
const medicationCreateSchema: z.ZodObject<{ name: z.ZodString; generic_name: z.ZodOptional<z.ZodNullable<z.ZodString>>; dosage: z.ZodString; unit: z.ZodOptional<z.ZodNullable<z.ZodString>>; frequency: z.ZodOptional<z.ZodEnum<{ once: "once"; daily: "daily"; twice_daily: "twice_daily"; three_times_daily: "three_times_daily"; four_times_daily: "four_times_daily"; as_needed: "as_needed"; weekly: "weekly"; custom: "custom"; }>>; times_of_day: z.ZodOptional<z.ZodArray<z.ZodString>>; start_date: z.ZodOptional<z.ZodNullable<z.ZodString>>; end_date: z.ZodOptional<z.ZodNullable<z.ZodString>>; notes: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `medicationUpdateSchema`

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
