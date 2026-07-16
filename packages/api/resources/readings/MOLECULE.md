# @molecule/api-resource-readings

`@molecule/api-resource-readings` — generic time-series sensor data.

Ingest readings via `POST /` or `POST /bulk`, then query raw or
aggregated (5min / hour / day rollups) via `GET /?granularity=…`.

Extracted from the energy-monitoring flagship — the pattern works
for any time-series surface (IoT sensors, app metrics, financial
tick data, etc.).

## Quick Start

```typescript
import { createReadingsRouter } from '@molecule/api-resource-readings'

// Mount behind your global auth middleware — every route requires a session.
app.use('/readings', createReadingsRouter())
// POST /readings        — ingest one reading
// POST /readings/bulk   — ingest up to 10 000 readings
// GET  /readings?granularity=raw|5min|hour|day&sensor_id=…&metric=…&from=…&to=…
```

```typescript
import { ingestReading, listAggregatedReadings } from '@molecule/api-resource-readings'

await ingestReading(userId, { sensor_id: 'meter-1', metric: 'kwh', value: 1.42 })
const hourly = await listAggregatedReadings(userId, { granularity: 'hour', metric: 'kwh' })
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-readings @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
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

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Unlike declarative-route resources, this package ships an Express Router
FACTORY (`createReadingsRouter()`) — there is no `routes` /
`requestHandlerMap` export for `mlcl inject`; mount the router yourself.
Every route reads the caller via `requireUser(res)`
(`res.locals.session.userId`, 401 fail-closed), so it must sit behind the
global auth middleware, and every query/insert is scoped to that owner —
never accept a client-supplied owner id.

Aggregated queries (`granularity` ≠ `raw`) run raw SQL using `date_trunc`,
`::int` casts, and `interval` literals — **PostgreSQL-only**. On the
SQLite/MySQL bonds use `granularity=raw` (DataStore-based, portable) and
bucket in application code, or supply your own dialect's aggregation.
`ingestBulk` inserts sequentially (one INSERT per reading, max 10 000 per
request).

Tables: `src/__setup__/readings.sql` creates `readings` (owner-scoped via
`owner_id`). An mlcl-scaffolded API replays `__setup__/*.sql` automatically
on migrate; anywhere else run it once — nothing at runtime creates them.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is a correctness bug to fix — not a skip:
- [ ] Recording a reading (POST /) persists its value, unit, metric, and
  recorded_at against the right sensor_id, and the chart/list reflects it:
  the newest point is the LAST entry of the chronological raw query (readings
  come back ordered by recorded_at ascending), so it shows the true latest
  value for that sensor — not a stale or averaged one.
- [ ] A time-range query (from/to) returns ONLY readings inside the window,
  in chronological order, with no gaps or duplicates — points outside the
  range are absent and a point exactly on a boundary is present.
- [ ] An aggregated query (granularity=5min|hour|day) computes the correct
  min/max/avg/sum/count for the readings in each bucket — spot-check one
  bucket by hand against its raw points (avg = sum / count; min and max are
  real members of the bucket; count matches the number of raw points).
  Aggregation is Postgres-only; on SQLite/MySQL use granularity=raw and
  verify the app buckets client-side instead.
- [ ] Every value renders as a real number with its unit (e.g. "1.42 kwh"),
  never NaN, null, or undefined; a gap in the readings shows as a gap (or an
  explicit "no data"), never as a fabricated 0.
- [ ] Malformed readings are rejected, not stored as truth: a non-numeric or
  NaN value, or a missing sensor_id/metric, is refused by validation (400) and
  never ingested; if the domain has a sane range, an out-of-range value is
  flagged/rejected by the app, not silently recorded. If the readings are
  health or otherwise personal, missing data is never shown as zero.
- [ ] AUTHORIZATION — readings are scoped to owner_id (the authenticated
  session user via requireUser): a user sees ONLY their own readings, and no
  sensor_id/from/to filter or guessed id surfaces another user's data.
  Ingestion is authenticated (401 fail-closed) and the owner is taken from the
  session, never the request body — a caller can't spoof readings onto another
  owner or device.
