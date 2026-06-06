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

```typescript
type Granularity = 'raw' | '5min' | 'hour' | 'day'
```

### Functions

#### `countReadings(ownerId)`

```typescript
function countReadings(ownerId: string): Promise<number>
```

#### `createReadingsRouter()`

```typescript
function createReadingsRouter(): Router
```

#### `ingestBulk(ownerId, readings)`

```typescript
function ingestBulk(ownerId: string, readings: { sensor_id: string; metric: string; value: number; unit?: string | null; recorded_at?: string; metadata?: Record<string, unknown>; }[]): Promise<number>
```

#### `ingestReading(ownerId, data)`

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

```typescript
function listRawReadings(ownerId: string, opts?: { sensor_id?: string; metric?: string; from?: string; to?: string; limit?: number; }): Promise<ReadingPoint[]>
```

### Constants

#### `GRANULARITIES`

```typescript
const GRANULARITIES: readonly ["raw", "5min", "hour", "day"]
```

#### `readingBulkSchema`

```typescript
const readingBulkSchema: z.ZodObject<{ readings: z.ZodArray<z.ZodObject<{ sensor_id: z.ZodString; metric: z.ZodString; value: z.ZodNumber; unit: z.ZodOptional<z.ZodNullable<z.ZodString>>; recorded_at: z.ZodOptional<z.ZodString>; metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>>; }, z.core.$strip>
```

#### `readingCreateSchema`

```typescript
const readingCreateSchema: z.ZodObject<{ sensor_id: z.ZodString; metric: z.ZodString; value: z.ZodNumber; unit: z.ZodOptional<z.ZodNullable<z.ZodString>>; recorded_at: z.ZodOptional<z.ZodString>; metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>
```

#### `readingQuerySchema`

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
