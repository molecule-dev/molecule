# @molecule/app-health

`@molecule/app-health`
Health and fitness data interface for molecule.dev

Provides a unified API for health/fitness data across platforms.
Supports reading/writing health data from HealthKit (iOS) and Google Fit (Android).

## Type
`native`

## Installation
```bash
npm install @molecule/app-health
```

## API

### Interfaces

#### `HealthCapabilities`

Health capabilities

```typescript
interface HealthCapabilities {
  /** Whether health data is supported */
  supported: boolean
  /** Platform (ios/android) */
  platform?: 'ios' | 'android'
  /** Readable data types */
  readableTypes: HealthDataType[]
  /** Writable data types */
  writableTypes: HealthDataType[]
  /** Whether background delivery is supported */
  supportsBackgroundDelivery: boolean
}
```

#### `HealthProvider`

Health provider interface

```typescript
interface HealthProvider {
  /**
   * Request authorization for data types.
   * @param readTypes - Health data types to request read access for.
   * @param writeTypes - Health data types to request write access for.
   * @returns Whether authorization was granted.
   */
  requestAuthorization(readTypes: HealthDataType[], writeTypes?: HealthDataType[]): Promise<boolean>

  /**
   * Check authorization status for a specific data type and access level.
   * @param type - The health data type to check.
   * @param access - Whether checking 'read' or 'write' access.
   * @returns The authorization status: 'authorized', 'denied', 'notDetermined', 'sharingDenied', or 'unsupported'.
   */
  getAuthorizationStatus(type: HealthDataType, access: 'read' | 'write'): Promise<HealthAuthStatus>

  /**
   * Query health samples
   * @param type - Data type
   * @param options - Query options
   */
  querySamples(type: HealthDataType, options: HealthQueryOptions): Promise<HealthSample[]>

  /**
   * Get aggregated statistics
   * @param type - Data type
   * @param options - Query options
   */
  queryStatistics(
    type: HealthDataType,
    options: HealthQueryOptions,
  ): Promise<{
    sum?: number
    average?: number
    min?: number
    max?: number
    count: number
  }>

  /**
   * Write a health sample
   * @param sample - Sample to write
   */
  writeSample(sample: Omit<HealthSample, 'sourceName' | 'device'>): Promise<void>

  /**
   * Query workouts
   * @param options - Query options
   */
  queryWorkouts(options: HealthQueryOptions): Promise<WorkoutSample[]>

  /**
   * Write a workout
   * @param workout - Workout to write
   */
  writeWorkout(workout: Omit<WorkoutSample, 'sourceName'>): Promise<void>

  /**
   * Query sleep data
   * @param options - Query options
   */
  querySleep(options: HealthQueryOptions): Promise<SleepSample[]>

  /**
   * Delete samples
   * @param type - Data type
   * @param options - Query options for samples to delete
   */
  deleteSamples(type: HealthDataType, options: HealthQueryOptions): Promise<void>

  /**
   * Open health app
   */
  openHealthApp(): Promise<void>

  /**
   * Get the platform's health data capabilities.
   * @returns The capabilities including supported data types, platform, and background delivery support.
   */
  getCapabilities(): Promise<HealthCapabilities>
}
```

#### `HealthQueryOptions`

Options for querying health data samples (date range, limit, sort order, data source).

```typescript
interface HealthQueryOptions {
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Maximum samples to return */
  limit?: number
  /** Sort ascending */
  ascending?: boolean
  /** Aggregate by interval */
  aggregateBy?: 'hour' | 'day' | 'week' | 'month'
}
```

#### `HealthSample`

Health data sample

```typescript
interface HealthSample {
  /** Data type */
  type: HealthDataType
  /** Value */
  value: number
  /** Unit */
  unit: string
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Source name */
  sourceName?: string
  /** Source bundle ID */
  sourceBundleId?: string
  /** Device name */
  device?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}
```

#### `SleepSample`

A recorded sleep session with stages (in-bed, asleep, awake, REM, deep, core) and efficiency.

```typescript
interface SleepSample {
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Sleep stages */
  stages?: {
    /** Stage type */
    type: 'inBed' | 'asleep' | 'awake' | 'rem' | 'deep' | 'core'
    /** Start date (ISO string) */
    startDate: string
    /** End date (ISO string) */
    endDate: string
    /** Duration in seconds */
    duration: number
  }[]
  /** Total time in bed (seconds) */
  timeInBed: number
  /** Total time asleep (seconds) */
  timeAsleep: number
  /** Sleep efficiency (0-1) */
  efficiency?: number
  /** Source name */
  sourceName?: string
}
```

#### `WorkoutSample`

A recorded workout with type, duration, energy burned, distance, and heart rate data.

```typescript
interface WorkoutSample {
  /** Workout type */
  workoutType: WorkoutType
  /** Start date (ISO string) */
  startDate: string
  /** End date (ISO string) */
  endDate: string
  /** Duration in seconds */
  duration: number
  /** Active energy burned (kcal) */
  activeEnergy?: number
  /** Total energy burned (kcal) */
  totalEnergy?: number
  /** Distance (meters) */
  distance?: number
  /** Average heart rate */
  avgHeartRate?: number
  /** Max heart rate */
  maxHeartRate?: number
  /** Source name */
  sourceName?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}
```

### Types

#### `HealthAuthStatus`

Health authorization status

```typescript
type HealthAuthStatus =
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'sharingDenied'
  | 'unsupported'
```

#### `HealthDataType`

Health data types

```typescript
type HealthDataType =
  // Activity
  | 'steps'
  | 'distance'
  | 'activeEnergy'
  | 'basalEnergy'
  | 'flights'
  | 'exerciseTime'
  | 'standTime'
  | 'moveMinutes'
  // Body measurements
  | 'weight'
  | 'height'
  | 'bodyMass'
  | 'bodyFat'
  | 'bmi'
  | 'leanBodyMass'
  | 'waistCircumference'
  // Vitals
  | 'heartRate'
  | 'restingHeartRate'
  | 'heartRateVariability'
  | 'bloodPressureSystolic'
  | 'bloodPressureDiastolic'
  | 'respiratoryRate'
  | 'oxygenSaturation'
  | 'bodyTemperature'
  | 'bloodGlucose'
  // Sleep
  | 'sleepAnalysis'
  | 'sleepInBed'
  | 'sleepAsleep'
  | 'sleepAwake'
  | 'sleepRem'
  | 'sleepDeep'
  | 'sleepCore'
  // Nutrition
  | 'water'
  | 'caffeine'
  | 'calories'
  | 'protein'
  | 'carbohydrates'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'sodium'
  // Workouts
  | 'workout'
  // Mindfulness
  | 'mindfulMinutes'
```

#### `WorkoutType`

Workout activity type

```typescript
type WorkoutType =
  | 'running'
  | 'walking'
  | 'cycling'
  | 'swimming'
  | 'hiking'
  | 'yoga'
  | 'strength'
  | 'highIntensityInterval'
  | 'rowing'
  | 'elliptical'
  | 'stairClimbing'
  | 'other'
```

### Functions

#### `calculateSleepEfficiency(sleep)`

Calculate sleep efficiency as the ratio of time asleep to time in bed.

```typescript
function calculateSleepEfficiency(sleep: SleepSample): number
```

- `sleep` — The sleep sample to analyze.

**Returns:** The sleep efficiency as a decimal between 0 and 1 (0 if no time in bed).

#### `deleteSamples(type, options)`

Delete health data samples of a given type within a date range.

```typescript
function deleteSamples(type: HealthDataType, options: HealthQueryOptions): Promise<void>
```

- `type` — The health data type whose samples to delete.
- `options` — Query options specifying the date range of samples to delete.

**Returns:** A promise that resolves when the samples are deleted.

#### `formatDuration(seconds, t)`

Format a duration in seconds as a human-readable string (e.g., "2h 15m" or "30m").

```typescript
function formatDuration(seconds: number, t?: ((key: string, values?: Record<string, unknown>, options?: { defaultValue?: string; }) => string)): string
```

- `seconds` — Duration in seconds.
- `t` — Optional i18n translation function for localized formatting.

**Returns:** The formatted duration string.

#### `getActiveEnergyToday()`

Get the total active energy burned today in kcal.

```typescript
function getActiveEnergyToday(): Promise<number>
```

**Returns:** The total active energy burned today.

#### `getAuthorizationStatus(type, access)`

Check the authorization status for a specific health data type and access level.

```typescript
function getAuthorizationStatus(type: HealthDataType, access: "read" | "write"): Promise<HealthAuthStatus>
```

- `type` — The health data type to check.
- `access` — Whether checking 'read' or 'write' access.

**Returns:** The authorization status: 'authorized', 'denied', 'notDetermined', 'sharingDenied', or 'unsupported'.

#### `getCapabilities()`

Get the platform's health data capabilities.

```typescript
function getCapabilities(): Promise<HealthCapabilities>
```

**Returns:** The capabilities including supported data types, platform, and background delivery support.

#### `getLastDaysRange(days)`

Get the ISO date range for the last N days (from N days ago at midnight to now).

```typescript
function getLastDaysRange(days: number): { startDate: string; endDate: string; }
```

- `days` — Number of days to look back.

**Returns:** An object with startDate and endDate as ISO strings.

#### `getLastNightSleep()`

Get the most recent sleep sample from the last 24 hours.

```typescript
function getLastNightSleep(): Promise<SleepSample | null>
```

**Returns:** The most recent SleepSample, or null if no sleep data is available.

#### `getProvider()`

Get the current health provider.

```typescript
function getProvider(): HealthProvider
```

**Returns:** The active HealthProvider instance.

#### `getStepsToday()`

Get the total step count for today.

```typescript
function getStepsToday(): Promise<number>
```

**Returns:** The total number of steps taken today.

#### `getTodayRange()`

Get the ISO date range for today (midnight to midnight).

```typescript
function getTodayRange(): { startDate: string; endDate: string; }
```

**Returns:** An object with startDate and endDate as ISO strings.

#### `getUnitForType(type)`

Get the standard unit string for a health data type.

```typescript
function getUnitForType(type: HealthDataType): string
```

- `type` — The health data type (e.g., 'steps', 'heartRate', 'weight').

**Returns:** The unit string (e.g., 'count', 'bpm', 'kg'), or empty string for unknown types.

#### `hasProvider()`

Check if a health provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a HealthProvider has been bonded.

#### `openHealthApp()`

Open the native health app (Apple Health or Google Fit).

```typescript
function openHealthApp(): Promise<void>
```

**Returns:** A promise that resolves when the health app is opened.

#### `querySamples(type, options)`

Query health data samples for a given type and date range.

```typescript
function querySamples(type: HealthDataType, options: HealthQueryOptions): Promise<HealthSample[]>
```

- `type` — The health data type to query (e.g., 'steps', 'heartRate').
- `options` — Query options including date range, limit, sort order, and aggregation.

**Returns:** An array of HealthSample objects matching the query.

#### `querySleep(options)`

Query sleep analysis data within a date range.

```typescript
function querySleep(options: HealthQueryOptions): Promise<SleepSample[]>
```

- `options` — Query options including date range, limit, and sort order.

**Returns:** An array of SleepSample objects with stage breakdown.

#### `queryStatistics(type, options)`

Get aggregated statistics (sum, average, min, max, count) for a health data type.

```typescript
function queryStatistics(type: HealthDataType, options: HealthQueryOptions): Promise<{ sum?: number; average?: number; min?: number; max?: number; count: number; }>
```

- `type` — The health data type to aggregate (e.g., 'steps', 'activeEnergy').
- `options` — Query options including date range and aggregation interval.

**Returns:** An object with sum, average, min, max, and count statistics.

#### `queryWorkouts(options)`

Query workout sessions within a date range.

```typescript
function queryWorkouts(options: HealthQueryOptions): Promise<WorkoutSample[]>
```

- `options` — Query options including date range, limit, and sort order.

**Returns:** An array of WorkoutSample objects.

#### `requestAuthorization(readTypes, writeTypes)`

Request authorization to read and/or write health data types.

```typescript
function requestAuthorization(readTypes: HealthDataType[], writeTypes?: HealthDataType[]): Promise<boolean>
```

- `readTypes` — Health data types to request read access for.
- `writeTypes` — Health data types to request write access for (optional).

**Returns:** Whether authorization was granted.

#### `setProvider(provider)`

Set the health provider.

```typescript
function setProvider(provider: HealthProvider): void
```

- `provider` — HealthProvider implementation to register.

#### `writeSample(sample)`

Write a health data sample to the health store.

```typescript
function writeSample(sample: Omit<HealthSample, "sourceName" | "device">): Promise<void>
```

- `sample` — The health sample to write (type, value, unit, dates).

**Returns:** A promise that resolves when the sample is written.

#### `writeWorkout(workout)`

Write a workout session to the health store.

```typescript
function writeWorkout(workout: Omit<WorkoutSample, "sourceName">): Promise<void>
```

- `workout` — The workout data (type, dates, duration, energy, distance, heart rate).

**Returns:** A promise that resolves when the workout is written.

### Constants

#### `DataTypeGroups`

Predefined groups of related health data types for common use cases.

```typescript
const DataTypeGroups: { readonly activity: HealthDataType[]; readonly body: HealthDataType[]; readonly vitals: HealthDataType[]; readonly sleep: HealthDataType[]; readonly nutrition: HealthDataType[]; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-health`.
