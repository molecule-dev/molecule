# @molecule/api-wearable

Wearable core interface for molecule.dev (server-side).

Defines a stack-neutral, provider-neutral contract for wearable
cloud-API bonds (Fitbit, Oura, Withings, Garmin, etc.) consumed by
handlers and background sync jobs. Wearable bonds register as a
**named multi-provider** — multiple wearable providers may be active
for a single user — so wiring uses the named bond API:
`bond('wearable', 'fitbit', provider)`.

## Quick Start

```typescript
import { setProvider, getProvider } from '@molecule/api-wearable'
import { createProvider as createFitbit } from '@molecule/api-wearable-fitbit'

setProvider('fitbit', createFitbit({ credentialsStore, redirectUri: '...' }))

const fitbit = getProvider('fitbit')
const today = await fitbit.getDailyActivity('user-1', '2026-05-01')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-wearable
```

## API

### Interfaces

#### `DailyActivity`

Daily activity rollup. All fields are zero-defaulted by the bond when
the provider does not return a value, so handlers can sum across days
without null-checks.

```typescript
interface DailyActivity {
  /** Calendar day this rollup covers (`YYYY-MM-DD`). */
  date: WearableDate
  /** Total step count for the day. */
  steps: number
  /** Total distance traveled, in meters. */
  distanceMeters: number
  /** Total calories burned (active + BMR), in kilocalories. */
  caloriesOut: number
  /** Active minutes (provider-specific intensity definitions). */
  activeMinutes: number
  /** Floors climbed, when reported. */
  floors?: number
  /** Total elevation gain, in meters, when reported. */
  elevationMeters?: number
  /** Resting heart-rate, in beats per minute, when reported. */
  restingHeartRate?: number
}
```

#### `HeartRateSummary`

Daily heart-rate summary.

```typescript
interface HeartRateSummary {
  /** Calendar day this summary covers (`YYYY-MM-DD`). */
  date: WearableDate
  /** Resting heart-rate, in beats per minute, when reported. */
  restingHeartRate?: number
  /** Per-zone breakdown, when reported. */
  zones?: HeartRateZone[]
}
```

#### `HeartRateZone`

Heart-rate zone definition (rest/fat-burn/cardio/peak or provider-named).

```typescript
interface HeartRateZone {
  /** Zone label as reported by the provider. */
  name: string
  /** Lower bound of the zone, in beats per minute (inclusive). */
  minBpm: number
  /** Upper bound of the zone, in beats per minute (exclusive). */
  maxBpm: number
  /** Minutes spent in the zone for this period. */
  minutes: number
  /** Calories burned in the zone, in kilocalories. */
  caloriesOut?: number
}
```

#### `SleepSession`

One sleep session. Most users have exactly one per night, but providers
report naps as separate sessions, so handlers must sum across the array.

```typescript
interface SleepSession {
  /** Provider-specific session id. */
  id: string
  /** Calendar day this session is bucketed under (`YYYY-MM-DD`). */
  date: WearableDate
  /** ISO 8601 sleep start. */
  start: string
  /** ISO 8601 sleep end. */
  end: string
  /** Total time in bed, in minutes. */
  timeInBedMinutes: number
  /** Total time asleep, in minutes (excludes `awake` segments). */
  timeAsleepMinutes: number
  /** Sleep efficiency percentage (0-100). */
  efficiency?: number
  /** Whether this session is the user's primary sleep for the day. */
  isMainSleep: boolean
  /** Per-stage minute totals when the provider reports stages. */
  stageSummary?: SleepStageSummary
  /** Per-segment stage breakdown when the provider reports stages. */
  segments?: SleepStageSegment[]
}
```

#### `SleepStageSegment`

A contiguous block of a single sleep stage within a sleep session.

```typescript
interface SleepStageSegment {
  /** Normalized stage. */
  stage: SleepStage
  /** ISO 8601 segment start. */
  start: string
  /** ISO 8601 segment end. */
  end: string
  /** Segment duration in seconds (provider-reported when available). */
  durationSeconds: number
}
```

#### `SleepStageSummary`

Per-stage totals for a sleep session, in minutes. Optional — providers
that only report the coarse "asleep" classification will omit
`light`/`deep`/`rem`.

```typescript
interface SleepStageSummary {
  /** Minutes spent awake during the session. */
  awakeMinutes?: number
  /** Minutes in light sleep. */
  lightMinutes?: number
  /** Minutes in deep sleep. */
  deepMinutes?: number
  /** Minutes in REM sleep. */
  remMinutes?: number
  /** Minutes restless (legacy classifications). */
  restlessMinutes?: number
}
```

#### `UserConnection`

Per-user OAuth tokens minted by {@link WearableProvider.connect} and
rotated by {@link WearableProvider.refreshConnection}. Bonds persist
these via a caller-supplied {@link WearableCredentialsStore}.

Token strings are NEVER thrown, logged, or echoed back in error
messages — implementations must sanitize all error paths.

```typescript
interface UserConnection {
  /** The user owning the connection in the host application. */
  userId: string
  /** Provider-specific account identifier (e.g. Fitbit `user_id`). */
  providerAccountId: string
  /** Current access token. */
  accessToken: string
  /** Refresh token used to mint new access tokens. */
  refreshToken: string
  /** Optional epoch-millis timestamp at which the access token expires. */
  expiresAt?: number
  /** Granted OAuth scopes (provider-specific names). */
  scopes?: string[]
  /** Epoch-millis timestamp at which the connection was first established. */
  connectedAt: number
}
```

#### `WearableCredentialsStore`

Persistence contract for {@link UserConnection} records. Implementations
are responsible for at-rest encryption (refresh tokens are bearer
credentials and MUST be stored securely).

The same store can back any number of provider bonds (Fitbit, Oura,
Withings, etc.) — segregation is by `(userId, providerName)` pair.

```typescript
interface WearableCredentialsStore {
  /**
   * Looks up the connection for `(userId, providerName)`.
   *
   * @param userId - Host-app user identifier.
   * @param providerName - Provider key, e.g. `"fitbit"`.
   * @returns The stored connection or `null` if none.
   */
  read(userId: string, providerName: string): Promise<UserConnection | null>
  /**
   * Persists a new or refreshed connection.
   *
   * @param providerName - Provider key, e.g. `"fitbit"`.
   * @param connection - The connection record to write.
   */
  write(providerName: string, connection: UserConnection): Promise<void>
  /**
   * Deletes the connection for `(userId, providerName)`.
   *
   * @param userId - Host-app user identifier.
   * @param providerName - Provider key.
   */
  remove(userId: string, providerName: string): Promise<void>
}
```

#### `WearableDateRange`

Inclusive date range.

```typescript
interface WearableDateRange {
  /** Lower-bound calendar day (`YYYY-MM-DD`), inclusive. */
  start: WearableDate
  /** Upper-bound calendar day (`YYYY-MM-DD`), inclusive. */
  end: WearableDate
}
```

#### `WearableProvider`

Wearable provider contract.

Each method takes a host-app `userId` rather than per-call credentials.
Implementations look up persisted {@link UserConnection} records via the
caller-supplied {@link WearableCredentialsStore}, transparently refresh
expired access tokens (writing the rotated record back to the store),
and surface refreshes as a side-effect of normal data calls.

Token-bearing values (access tokens, refresh tokens, Authorization
headers, OAuth `error_description` payloads that may include the token)
MUST NEVER be thrown, logged, or returned in error messages — every
error path must be sanitized.

```typescript
interface WearableProvider {
  /** Stable provider key used for credential-store segregation, e.g. `"fitbit"`. */
  readonly providerName: string

  /**
   * Reads the daily activity rollup for `(userId, date)`.
   *
   * @param userId - Host-app user identifier.
   * @param date - Calendar day (`YYYY-MM-DD`).
   * @returns Normalized daily activity.
   */
  getDailyActivity(userId: string, date: WearableDate): Promise<DailyActivity>

  /**
   * Reads sleep sessions bucketed under `(userId, date)`. Most days return
   * a single primary session; multi-nap days return multiple.
   *
   * @param userId - Host-app user identifier.
   * @param date - Calendar day (`YYYY-MM-DD`).
   * @returns All sleep sessions bucketed under that day.
   */
  getDailySleep(userId: string, date: WearableDate): Promise<SleepSession[]>

  /**
   * Reads the daily heart-rate summary for `(userId, date)`.
   *
   * @param userId - Host-app user identifier.
   * @param date - Calendar day (`YYYY-MM-DD`).
   * @returns Normalized daily heart-rate summary.
   */
  getDailyHeartRate(userId: string, date: WearableDate): Promise<HeartRateSummary>

  /**
   * Reads body-weight entries for the user across `range`. Providers cap
   * how far back a single call may reach — implementations should clamp
   * `range` to the provider's documented maximum and return only the
   * available entries.
   *
   * @param userId - Host-app user identifier.
   * @param range - Inclusive calendar-day range.
   * @returns Weight entries, ordered by `recordedAt` ascending.
   */
  getWeight(userId: string, range: WearableDateRange): Promise<WeightEntry[]>

  /**
   * Exchanges an OAuth authorization `code` for tokens and persists the
   * resulting {@link UserConnection} via the bond's credentials store.
   *
   * @param userId - Host-app user identifier (the local user accepting the link).
   * @param code - Authorization code from the OAuth redirect callback.
   * @returns The freshly-minted connection (already persisted).
   */
  connect(userId: string, code: string): Promise<UserConnection>

  /**
   * Forces a refresh of the user's access token using the stored refresh
   * token. The rotated connection is persisted before being returned.
   *
   * @param userId - Host-app user identifier.
   * @returns The rotated connection (already persisted).
   */
  refreshConnection(userId: string): Promise<UserConnection>

  /**
   * Revokes (best-effort) and removes the user's connection record.
   *
   * Implementations SHOULD attempt to revoke the token at the provider but
   * MUST always remove the local record even if revocation fails — leaking
   * a record after `disconnect` is worse than a stranded provider-side
   * token.
   *
   * @param userId - Host-app user identifier.
   */
  disconnect(userId: string): Promise<void>
}
```

#### `WeightEntry`

One body-weight reading.

```typescript
interface WeightEntry {
  /** ISO 8601 timestamp at which the reading was taken. */
  recordedAt: string
  /** Calendar day of the reading (`YYYY-MM-DD`). */
  date: WearableDate
  /** Weight in kilograms. */
  weightKg: number
  /** Body-fat percentage (0-100), when reported. */
  bodyFatPercent?: number
  /** BMI (kg / m²), when reported. */
  bmi?: number
  /** Provider-specific entry id. */
  id?: string
}
```

### Types

#### `SleepStage`

Sleep stage taxonomy normalized across providers.

- `awake` — periods awake during a sleep session
- `light`, `deep`, `rem` — modern stage classifications
- `restless`, `asleep` — legacy/coarse classifications used by some providers
- `unknown` — fallback for unmapped values

```typescript
type SleepStage = 'awake' | 'light' | 'deep' | 'rem' | 'restless' | 'asleep' | 'unknown'
```

#### `WearableDate`

Calendar-day identifier in `YYYY-MM-DD` format. Wearable providers
universally bucket activity/sleep/HR data by local-day, so the core
exchanges date strings (not absolute timestamps) for per-day reads.

```typescript
type WearableDate = string
```

### Functions

#### `getOptionalProvider(name)`

Retrieves the bonded wearable provider for `name`, or `null` when none
is bonded. Use this when a missing connection is a normal state (e.g.
the user hasn't linked a Fitbit account yet).

```typescript
function getOptionalProvider(name: string): WearableProvider | null
```

- `name` — Provider key.

**Returns:** The bonded provider, or `null`.

#### `getProvider(name)`

Retrieves the bonded wearable provider for `name`, throwing if none is
configured.

```typescript
function getProvider(name: string): WearableProvider
```

- `name` — Provider key, e.g. `'fitbit'`.

**Returns:** The bonded wearable provider.

#### `hasProvider(name)`

Checks whether a wearable provider is bonded under `name`.

```typescript
function hasProvider(name: string): boolean
```

- `name` — Provider key.

**Returns:** `true` if bonded.

#### `listProviders()`

Lists every currently-bonded wearable provider name (e.g.
`['fitbit', 'oura']`). Useful for rendering a "linked accounts"
settings page or fanning a sync job out across all bonded providers.

```typescript
function listProviders(): string[]
```

**Returns:** The list of bonded provider keys.

#### `setProvider(name, provider)`

Registers a wearable provider under the given name (e.g. `'fitbit'`).
Bond packages call this during application startup.

```typescript
function setProvider(name: string, provider: WearableProvider): void
```

- `name` — Stable provider key, matching {@link WearableProvider.providerName}.
- `provider` — The wearable provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Fitbit | `@molecule/api-wearable-fitbit` |
| Oura Ring | `@molecule/api-wearable-oura` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
