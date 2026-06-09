# @molecule/api-resource-readings

`@molecule/api-resource-readings` — generic time-series sensor data.

Ingest readings via `POST /` or `POST /bulk`, then query raw or
aggregated (5min / hour / day rollups) via `GET /?granularity=…`.

Extracted from the energy-monitoring flagship — the pattern works
for any time-series surface (IoT sensors, app metrics, financial
tick data, etc.).

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-readings
```

## API

### Interfaces

#### `AggregatedPoint`

A time-bucketed aggregate of sensor readings (min/max/avg/sum/count per bucket).

```typescript
interface AggregatedPoint {
  bucket_at: string
  metric: string
  sensor_id: string
  min: number
  max: number
  avg: number
  sum: number
  count: number
}
```

#### `ReadingPoint`

A single sensor reading data point returned from a query.

```typescript
interface ReadingPoint {
  recorded_at: string
  value: number
  metric: string
  sensor_id: string
  unit: string | null
}
```

#### `ReadingRow`

Raw database row shape for a single sensor reading record.

```typescript
interface ReadingRow {
  id: string
  owner_id: string
  sensor_id: string
  metric: string
  value: number
  unit: string | null
  recorded_at: string | Date
  metadata: Record<string, unknown> | null
}
```

### Types

#### `Granularity`

Time-bucket granularity options for aggregating sensor readings.

```typescript
type Granularity = 'raw' | '5min' | 'hour' | 'day'
```

### Functions

#### `countReadings(ownerId)`

Return the total number of readings stored for the given owner.

```typescript
function countReadings(ownerId: string): Promise<number>
```

#### `createReadingsRouter()`

Creates and returns the Express router for the readings resource endpoints.

```typescript
function createReadingsRouter(): Router
```

#### `ingestBulk(ownerId, readings)`

Persist multiple sensor readings in sequence, returning the number successfully inserted.

```typescript
function ingestBulk(ownerId: string, readings: { sensor_id: string; metric: string; value: number; unit?: string | null; recorded_at?: string; metadata?: Record<string, unknown>; }[]): Promise<number>
```

#### `ingestReading(ownerId, data)`

Persist a single sensor reading row for the given owner.

```typescript
function ingestReading(ownerId: string, data: { sensor_id: string; metric: string; value: number; unit?: string | null; recorded_at?: string; metadata?: Record<string, unknown>; }): Promise<ReadingRow>
```

#### `listAggregatedReadings(ownerId, opts)`

Group readings into time buckets and aggregate per bucket. Returns
`min/max/avg/sum/count` per `(bucket, metric, sensor_id)`.

```typescript
function listAggregatedReadings(ownerId: string, opts: { granularity: Exclude<Granularity, "raw">; sensor_id?: string; metric?: string; from?: string; to?: string; limit?: number; }): Promise<AggregatedPoint[]>
```

#### `listRawReadings(ownerId, opts?)`

Fetch raw, unaggregated reading points for an owner, optionally filtered by sensor, metric, and time range.

```typescript
function listRawReadings(ownerId: string, opts?: { sensor_id?: string; metric?: string; from?: string; to?: string; limit?: number; }): Promise<ReadingPoint[]>
```

### Constants

#### `GRANULARITIES`

Supported time-bucket granularities for reading aggregation queries.

```typescript
const GRANULARITIES: readonly ["raw", "5min", "hour", "day"]
```

#### `readingBulkSchema`

Zod schema for validating a bulk readings creation payload (1–10 000 entries).

```typescript
const readingBulkSchema: z.ZodObject<{ readings: z.ZodArray<z.ZodObject<{ sensor_id: z.ZodString; metric: z.ZodString; value: z.ZodNumber; unit: z.ZodOptional<z.ZodNullable<z.ZodString>>; recorded_at: z.ZodOptional<z.ZodString>; metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>>; }, z.core.$strip>
```

#### `readingCreateSchema`

Zod schema for validating a single reading creation payload.

```typescript
const readingCreateSchema: z.ZodObject<{ sensor_id: z.ZodString; metric: z.ZodString; value: z.ZodNumber; unit: z.ZodOptional<z.ZodNullable<z.ZodString>>; recorded_at: z.ZodOptional<z.ZodString>; metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>
```

#### `readingQuerySchema`

Zod schema for validating reading list/query filter parameters.

```typescript
const readingQuerySchema: z.ZodObject<{ sensor_id: z.ZodOptional<z.ZodString>; metric: z.ZodOptional<z.ZodString>; from: z.ZodOptional<z.ZodString>; to: z.ZodOptional<z.ZodString>; granularity: z.ZodOptional<z.ZodEnum<{ raw: "raw"; "5min": "5min"; hour: "hour"; day: "day"; }>>; limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>; }, z.core.$strip>
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
