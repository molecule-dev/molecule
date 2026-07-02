# @molecule/api-wearable-oura

Oura Cloud API v2 bond for `@molecule/api-wearable`.

Implements daily activity, sleep, and heart-rate ingestion against the
Oura Cloud API v2 using OAuth 2.0 with refresh-token rotation. Wires
under the `wearable` named-multi-provider category as `'oura'`.

Oura does not track body weight, so {@link createProvider} returns
`[]` from `getWeight()` — pair Oura with another wearable bond
(e.g. `@molecule/api-wearable-fitbit` or `-withings`) when weight
data is required.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-wearable'
import { createProvider, PROVIDER_NAME } from '@molecule/api-wearable-oura'

const oura = createProvider({
  redirectUri: 'https://app.example.com/auth/oura/callback',
  credentialsStore: myCredentialsStore,
})

setProvider(PROVIDER_NAME, oura)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-wearable-oura
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
    date: WearableDate;
    /** Total step count for the day. */
    steps: number;
    /** Total distance traveled, in meters. */
    distanceMeters: number;
    /** Total calories burned (active + BMR), in kilocalories. */
    caloriesOut: number;
    /** Active minutes (provider-specific intensity definitions). */
    activeMinutes: number;
    /** Floors climbed, when reported. */
    floors?: number;
    /** Total elevation gain, in meters, when reported. */
    elevationMeters?: number;
    /** Resting heart-rate, in beats per minute, when reported. */
    restingHeartRate?: number;
}
```

#### `HeartRateSummary`

Daily heart-rate summary.

```typescript
interface HeartRateSummary {
    /** Calendar day this summary covers (`YYYY-MM-DD`). */
    date: WearableDate;
    /** Resting heart-rate, in beats per minute, when reported. */
    restingHeartRate?: number;
    /** Per-zone breakdown, when reported. */
    zones?: HeartRateZone[];
}
```

#### `HeartRateZone`

Heart-rate zone definition (rest/fat-burn/cardio/peak or provider-named).

```typescript
interface HeartRateZone {
    /** Zone label as reported by the provider. */
    name: string;
    /** Lower bound of the zone, in beats per minute (inclusive). */
    minBpm: number;
    /** Upper bound of the zone, in beats per minute (exclusive). */
    maxBpm: number;
    /** Minutes spent in the zone for this period. */
    minutes: number;
    /** Calories burned in the zone, in kilocalories. */
    caloriesOut?: number;
}
```

#### `OuraAuthorizeStart`

Result of {@link OuraProvider.startAuthorize} — the URL the host
should redirect the user to plus the `state` value to round-trip.

```typescript
interface OuraAuthorizeStart {
  /** Oura OAuth authorize URL. */
  url: string
  /** Opaque `state` value the host MUST verify on the callback. */
  state: string
}
```

#### `OuraProvider`

Public surface returned by {@link createProvider}. Extends the
stack-neutral {@link import('@molecule/api-wearable').WearableProvider}
with an Oura-flavored `startAuthorize()` helper for hosts that want
the bond to build the authorize URL.

```typescript
interface OuraProvider extends WearableProviderType {
  /**
   * Builds the Oura authorize URL with a random `state` value. The host
   * is responsible for round-tripping `state` through the OAuth callback
   * and verifying it before calling {@link OuraProvider.connect}.
   *
   * @returns The URL to redirect to and the `state` value.
   */
  startAuthorize(): OuraAuthorizeStart
}
```

#### `OuraProviderOptions`

Configuration options for {@link createProvider}.

```typescript
interface OuraProviderOptions {
  /**
   * OAuth client id. Defaults to `process.env.OAUTH_OURA_CLIENT_ID`.
   */
  clientId?: string
  /**
   * OAuth client secret. Defaults to
   * `process.env.OAUTH_OURA_CLIENT_SECRET`.
   */
  clientSecret?: string
  /**
   * OAuth redirect URI registered with the Oura application.
   */
  redirectUri: string
  /**
   * Persists user connections (access + refresh tokens). Required.
   */
  credentialsStore: WearableCredentialsStore
  /**
   * OAuth scopes to request when starting authorization. Defaults to the
   * union needed for daily activity, sleep, heart-rate, and personal
   * info reads.
   */
  scopes?: readonly string[]
  /**
   * Override the Oura Cloud API base URL. Defaults to
   * `https://api.ouraring.com/v2`.
   */
  apiBaseUrl?: string
  /**
   * Override the Oura OAuth authorize endpoint. Defaults to
   * `https://cloud.ouraring.com/oauth/authorize`.
   */
  authorizeUrl?: string
  /**
   * Override the Oura OAuth token endpoint. Defaults to
   * `https://api.ouraring.com/oauth/token`.
   */
  tokenUrl?: string
  /**
   * Override the Oura OAuth token-revoke endpoint. Defaults to
   * `https://api.ouraring.com/oauth/revoke`.
   */
  revokeUrl?: string
  /**
   * Request timeout in milliseconds. Defaults to `15_000`.
   */
  timeoutMs?: number
  /**
   * Optional override for the random-bytes generator used for the OAuth
   * `state` parameter. Tests inject a deterministic generator.
   */
  randomBytes?: (size: number) => Uint8Array
  /**
   * Optional clock override, primarily for tests. Defaults to `Date.now`.
   */
  now?: () => number
}
```

#### `SleepSession`

One sleep session. Most users have exactly one per night, but providers
report naps as separate sessions, so handlers must sum across the array.

```typescript
interface SleepSession {
    /** Provider-specific session id. */
    id: string;
    /** Calendar day this session is bucketed under (`YYYY-MM-DD`). */
    date: WearableDate;
    /** ISO 8601 sleep start. */
    start: string;
    /** ISO 8601 sleep end. */
    end: string;
    /** Total time in bed, in minutes. */
    timeInBedMinutes: number;
    /** Total time asleep, in minutes (excludes `awake` segments). */
    timeAsleepMinutes: number;
    /** Sleep efficiency percentage (0-100). */
    efficiency?: number;
    /** Whether this session is the user's primary sleep for the day. */
    isMainSleep: boolean;
    /** Per-stage minute totals when the provider reports stages. */
    stageSummary?: SleepStageSummary;
    /** Per-segment stage breakdown when the provider reports stages. */
    segments?: SleepStageSegment[];
}
```

#### `SleepStageSegment`

A contiguous block of a single sleep stage within a sleep session.

```typescript
interface SleepStageSegment {
    /** Normalized stage. */
    stage: SleepStage;
    /** ISO 8601 segment start. */
    start: string;
    /** ISO 8601 segment end. */
    end: string;
    /** Segment duration in seconds (provider-reported when available). */
    durationSeconds: number;
}
```

#### `SleepStageSummary`

Per-stage totals for a sleep session, in minutes. Optional — providers
that only report the coarse "asleep" classification will omit
`light`/`deep`/`rem`.

```typescript
interface SleepStageSummary {
    /** Minutes spent awake during the session. */
    awakeMinutes?: number;
    /** Minutes in light sleep. */
    lightMinutes?: number;
    /** Minutes in deep sleep. */
    deepMinutes?: number;
    /** Minutes in REM sleep. */
    remMinutes?: number;
    /** Minutes restless (legacy classifications). */
    restlessMinutes?: number;
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
    userId: string;
    /** Provider-specific account identifier (e.g. Fitbit `user_id`). */
    providerAccountId: string;
    /** Current access token. */
    accessToken: string;
    /** Refresh token used to mint new access tokens. */
    refreshToken: string;
    /** Optional epoch-millis timestamp at which the access token expires. */
    expiresAt?: number;
    /** Granted OAuth scopes (provider-specific names). */
    scopes?: string[];
    /** Epoch-millis timestamp at which the connection was first established. */
    connectedAt: number;
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
    read(userId: string, providerName: string): Promise<UserConnection | null>;
    /**
     * Persists a new or refreshed connection.
     *
     * @param providerName - Provider key, e.g. `"fitbit"`.
     * @param connection - The connection record to write.
     */
    write(providerName: string, connection: UserConnection): Promise<void>;
    /**
     * Deletes the connection for `(userId, providerName)`.
     *
     * @param userId - Host-app user identifier.
     * @param providerName - Provider key.
     */
    remove(userId: string, providerName: string): Promise<void>;
}
```

#### `WearableDateRange`

Inclusive date range.

```typescript
interface WearableDateRange {
    /** Lower-bound calendar day (`YYYY-MM-DD`), inclusive. */
    start: WearableDate;
    /** Upper-bound calendar day (`YYYY-MM-DD`), inclusive. */
    end: WearableDate;
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
    readonly providerName: string;
    /**
     * Reads the daily activity rollup for `(userId, date)`.
     *
     * @param userId - Host-app user identifier.
     * @param date - Calendar day (`YYYY-MM-DD`).
     * @returns Normalized daily activity.
     */
    getDailyActivity(userId: string, date: WearableDate): Promise<DailyActivity>;
    /**
     * Reads sleep sessions bucketed under `(userId, date)`. Most days return
     * a single primary session; multi-nap days return multiple.
     *
     * @param userId - Host-app user identifier.
     * @param date - Calendar day (`YYYY-MM-DD`).
     * @returns All sleep sessions bucketed under that day.
     */
    getDailySleep(userId: string, date: WearableDate): Promise<SleepSession[]>;
    /**
     * Reads the daily heart-rate summary for `(userId, date)`.
     *
     * @param userId - Host-app user identifier.
     * @param date - Calendar day (`YYYY-MM-DD`).
     * @returns Normalized daily heart-rate summary.
     */
    getDailyHeartRate(userId: string, date: WearableDate): Promise<HeartRateSummary>;
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
    getWeight(userId: string, range: WearableDateRange): Promise<WeightEntry[]>;
    /**
     * Exchanges an OAuth authorization `code` for tokens and persists the
     * resulting {@link UserConnection} via the bond's credentials store.
     *
     * @param userId - Host-app user identifier (the local user accepting the link).
     * @param code - Authorization code from the OAuth redirect callback.
     * @returns The freshly-minted connection (already persisted).
     */
    connect(userId: string, code: string): Promise<UserConnection>;
    /**
     * Forces a refresh of the user's access token using the stored refresh
     * token. The rotated connection is persisted before being returned.
     *
     * @param userId - Host-app user identifier.
     * @returns The rotated connection (already persisted).
     */
    refreshConnection(userId: string): Promise<UserConnection>;
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
    disconnect(userId: string): Promise<void>;
}
```

#### `WeightEntry`

One body-weight reading.

```typescript
interface WeightEntry {
    /** ISO 8601 timestamp at which the reading was taken. */
    recordedAt: string;
    /** Calendar day of the reading (`YYYY-MM-DD`). */
    date: WearableDate;
    /** Weight in kilograms. */
    weightKg: number;
    /** Body-fat percentage (0-100), when reported. */
    bodyFatPercent?: number;
    /** BMI (kg / m²), when reported. */
    bmi?: number;
    /** Provider-specific entry id. */
    id?: string;
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
type SleepStage = 'awake' | 'light' | 'deep' | 'rem' | 'restless' | 'asleep' | 'unknown';
```

#### `WearableDate`

Calendar-day identifier in `YYYY-MM-DD` format. Wearable providers
universally bucket activity/sleep/HR data by local-day, so the core
exchanges date strings (not absolute timestamps) for per-day reads.

```typescript
type WearableDate = string;
```

### Functions

#### `base64UrlEncode(bytes)`

Base64url-encodes the bytes (RFC 4648 §5 with `=` padding stripped).

```typescript
function base64UrlEncode(bytes: Uint8Array<ArrayBufferLike>): string
```

- `bytes` — The bytes to encode.

**Returns:** A base64url string.

#### `createProvider(options)`

Creates an Oura wearable provider.

```typescript
function createProvider(options: OuraProviderOptions): OuraProvider
```

- `options` — Required: `redirectUri` + `credentialsStore`. Falls

**Returns:** An Oura-flavored {@link OuraProvider}.

#### `decodeOuraHypnogram(hypnogram, bedtimeStart)`

Decodes Oura's `sleep_phase_5_min` hypnogram into a list of contiguous
{@link SleepStageSegment} records anchored at `bedtimeStart`.

Each character represents a 5-minute window. Adjacent same-stage
windows are coalesced into a single segment so consumers don't have
to do the bookkeeping.

```typescript
function decodeOuraHypnogram(hypnogram: string | undefined, bedtimeStart: string): SleepStageSegment[] | undefined
```

- `hypnogram` — The Oura hypnogram string.
- `bedtimeStart` — ISO 8601 timestamp anchoring segment 0.

**Returns:** Decoded sleep segments, or `undefined` when no hypnogram exists.

#### `fromOuraActivity(date, entry)`

Translates an Oura `usercollection/daily_activity` entry into the
normalized {@link DailyActivity} shape. Missing fields are
zero-defaulted so handlers can sum across days without null guards.

```typescript
function fromOuraActivity(date: string, entry: OuraDailyActivityEntry | undefined): DailyActivity
```

- `date` — The calendar day requested.
- `entry` — Oura's daily-activity response entry, or `undefined`.

**Returns:** A normalized daily activity record.

#### `fromOuraHeartRate(date, raw)`

Aggregates an Oura `usercollection/heartrate` payload into the
normalized {@link HeartRateSummary} shape.

Oura returns per-sample BPM readings rather than a daily resting-HR
value or zone breakdown; the bond derives a coarse resting-HR estimate
from the minimum sample of the day. Zone data is not reported by this
endpoint, so `zones` is left undefined.

```typescript
function fromOuraHeartRate(date: string, raw: OuraHeartRateResponse): HeartRateSummary
```

- `date` — Calendar day the response was requested for.
- `raw` — Oura's heart-rate response payload.

**Returns:** A normalized heart-rate summary.

#### `fromOuraSleep(date, raw)`

Translates an Oura `usercollection/sleep` payload into a list of
normalized {@link SleepSession} records ordered by start ascending.

Oura's `type === 'long_sleep'` corresponds to the user's main nightly
sleep — the bond marks any matching session as `isMainSleep: true`,
with naps and short sessions as `false`.

```typescript
function fromOuraSleep(date: string, raw: OuraSleepResponse): SleepSession[]
```

- `date` — Calendar day requested.
- `raw` — Oura's sleep response payload.

**Returns:** Normalized sleep sessions.

#### `mapSleepPhaseDigit(digit)`

Maps an Oura `sleep_phase_5_min` digit onto our normalized
{@link SleepStage} taxonomy. Oura uses `1=deep`, `2=light`, `3=rem`,
`4=awake`; anything else falls through to `unknown`.

```typescript
function mapSleepPhaseDigit(digit: string): SleepStage
```

- `digit` — The single hypnogram character.

**Returns:** A normalized sleep stage.

### Constants

#### `PROVIDER_NAME`

Stable provider key used in the credentials store and bond name.

```typescript
const PROVIDER_NAME: "oura"
```

#### `wearableOuraSecretDefinitions`

Secret definitions required by the Oura wearable bond.

```typescript
const wearableOuraSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-wearable` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-wearable` ^1.0.0

### Environment Variables

- `OAUTH_OURA_CLIENT_ID` *(required)* — Oura OAuth client ID
  - Setup: Create an OAuth application in the Oura Cloud developer portal.
  - Get it here: [https://cloud.ouraring.com/oauth/applications](https://cloud.ouraring.com/oauth/applications)
- `OAUTH_OURA_CLIENT_SECRET` *(required)* — Oura client secret
  - Setup: Shown when creating the OAuth application in Oura Cloud.
  - Get it here: [https://cloud.ouraring.com/oauth/applications](https://cloud.ouraring.com/oauth/applications)
