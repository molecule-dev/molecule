# @molecule/api-entitlements

Tier-based entitlements core for molecule.dev.

Provides the typed `Tier<TLimits>` / `TierRegistry<TLimits>` shapes, a
per-process plan-key cache, and Express middleware factories that gate
endpoints by tier category or quantitative limit.

Apps declare their own `TLimits` shape, construct a registry via
`defineTiers(...)`, and bond it via `setProvider(...)` at startup. The
webhook glue that maps Stripe / Apple / Google subscription events to
`users.planKey` already lives in `@molecule/api-resource-user`.

## Quick Start

```typescript
import { defineTiers, setProvider } from '@molecule/api-entitlements'

interface BlogLimits {
  maxPosts: number
  maxCommentsPerDay: number
}

const registry = defineTiers<BlogLimits>({
  tiers: {
    free: { planKey: 'free', category: 'free', name: 'Free', limits: { maxPosts: 5, maxCommentsPerDay: 50 } },
    stripeMonthly: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', limits: { maxPosts: 100, maxCommentsPerDay: 1000 } },
  },
  defaultPlanKey: 'free',
  categoryOrder: ['free', 'pro'],
})

setProvider(registry)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-entitlements
```

## API

### Interfaces

#### `BuildLimitErrorOptions`

Options for building a limit error payload.

```typescript
interface BuildLimitErrorOptions<TLimits = unknown> {
  /** Identifier for the limit that was hit (e.g. `'maxProjects'`). */
  limitType: LimitType

  /** The current user's tier category (e.g. `'free'`, `'anonymous'`). */
  category: string

  /** The numeric limit that was exceeded. */
  currentLimit: number

  /**
   * Optional accessor that maps the next-up tier's `limits` to the relevant
   * numeric value. When omitted, `upgradedLimit` is `null` and the upgrade
   * prompt simply names the next tier without a number.
   */
  resolveUpgradedLimit?: (nextLimits: TLimits) => number | null | undefined

  /** Seconds until the client should retry, when applicable. */
  retryAfter?: number

  /** Optional override for the localized error message. */
  message?: string
}
```

#### `DefineTiersOptions`

Options for constructing a `TierRegistry` via `defineTiers`.

```typescript
interface DefineTiersOptions<TLimits = unknown> {
  /** All tiers indexed by `planKey`. Must include an entry matching `defaultPlanKey`. */
  tiers: Record<string, Tier<TLimits>>

  /**
   * The plan key that maps to the default tier — used for unrecognized,
   * expired, or null plan keys. Conventionally `'free'` or `''`.
   */
  defaultPlanKey: string

  /**
   * The category upgrade order. Categories listed earlier are considered
   * lower-tier; later ones higher. Used by `getNextCategory` to power
   * upgrade prompts.
   *
   * @example `['anonymous', 'free', 'pro', 'team']`
   */
  categoryOrder: string[]
}
```

#### `EnforceLimitOptions`

Options for the `enforceLimit` middleware.

```typescript
interface EnforceLimitOptions<TLimits = unknown> {
  /** Stable identifier for the limit (used in error payloads, telemetry). */
  limitType: LimitType

  /**
   * Pulls the numeric cap out of the user's tier `limits` object.
   *
   * @param limits - The tier-specific limits.
   * @returns The numeric cap to enforce.
   */
  getLimit: (limits: TLimits) => number

  /**
   * Computes the user's current usage. Receives the userId resolved from the
   * session and the request object so apps can scope by additional fields
   * (e.g. organization, project) when needed.
   *
   * @param userId - The authenticated user ID.
   * @param req - The incoming request, in case scoping needs query/body data.
   * @returns The current usage count.
   */
  getCurrent: (userId: string, req: Request) => Promise<number> | number

  /**
   * Optional override for the response status. Defaults to 403; some apps
   * prefer 429 for usage-style limits.
   */
  status?: number
}
```

#### `LimitErrorPayload`

Structured payload returned to clients when a tier limit is exceeded.

Frontends use this to render upgrade prompts that name the user's current
tier, the limit that was hit, and the next tier that would lift it.

```typescript
interface LimitErrorPayload {
  /** Localized human-readable error message. */
  error: string

  /** Stable machine-readable identifier of the limit type (e.g. `'maxProjects'`). */
  limitType: LimitType

  /** The numeric limit on the user's current tier. */
  currentLimit: number

  /** The numeric limit the user would have on the next-up tier, or `null` if none. */
  upgradedLimit: number | null

  /** The user's current tier category. */
  currentTier: string

  /** The next-up tier category, or `null` if already at the top. */
  upgradeTier: string | null

  /** Whether the user must sign up before upgrading (anonymous → registered). */
  requiresSignup: boolean

  /** Seconds until the client should retry, when applicable (rate-limit-style errors). */
  retryAfter?: number
}
```

#### `PlanCacheEntry`

Cached plan-key entry used by the plan cache to avoid a DB query on every
request. Bond packages and middleware should not depend on the cache shape
directly — use `getCachedPlanKey()` instead.

```typescript
interface PlanCacheEntry {
  /** The cached plan key, or `null` for free/expired plans. */
  planKey: string | null

  /** Absolute timestamp (ms since epoch) at which this entry expires. */
  expiresAt: number
}
```

#### `PlanCacheOptions`

Configuration options for the plan cache.

```typescript
interface PlanCacheOptions {
  /** Cache entry TTL in milliseconds. Defaults to 5 minutes. */
  ttlMs?: number

  /**
   * Max number of cached entries. When exceeded, the oldest insertion-order
   * entry is evicted on the next write. Defaults to 50,000.
   */
  maxEntries?: number
}
```

#### `Tier`

A subscription tier with quantitative limits.

Each application declares its own `TLimits` shape — for example, a personal
finance app might use `{ maxAccounts: number; maxTransactionsPerMonth: number }`
while a chat app might use `{ maxMessagesPerDay: number; maxParticipants: number }`.

```typescript
interface Tier<TLimits = unknown> {
  /**
   * The plan key that identifies this tier. Matches the `planKey` used by
   * `@molecule/api-payments` `Plan` records and by the `planKey` field on
   * the `users` resource.
   */
  planKey: string

  /**
   * The tier category, used for ordering and upgrade prompts.
   * Examples: `'anonymous'`, `'free'`, `'pro'`, `'team'`.
   */
  category: string

  /** Human-readable display name shown on pricing pages and entitlement errors. */
  name: string

  /** Application-defined quantitative limits enforced at runtime. */
  limits: TLimits
}
```

#### `TierRegistry`

Registry of all tiers defined by an application.

Apps construct a `TierRegistry` via `defineTiers(...)` at startup and bond it
via `setProvider(registry)`. Middleware and handler code then look up the
tier for a given user via the bonded registry.

```typescript
interface TierRegistry<TLimits = unknown> {
  /**
   * Look up a tier by plan key. If the key is null/undefined or unrecognized,
   * returns the default tier (typically the free tier).
   *
   * @param planKey - The plan key to look up, or null/undefined for the default tier.
   * @returns The matching tier, or the default tier when the key is unknown.
   */
  findTier(planKey: string | null | undefined): Tier<TLimits>

  /**
   * Returns the default tier — the tier applied to unauthenticated, expired,
   * or unrecognized plans. Typically the free tier.
   *
   * @returns The default tier.
   */
  getDefaultTier(): Tier<TLimits>

  /**
   * Returns every registered tier, in registration order.
   *
   * @returns All registered tiers.
   */
  getAllTiers(): Tier<TLimits>[]

  /**
   * Returns the rank of a category in the upgrade order (0 = lowest).
   * Returns `null` if the category was not declared in the registry's
   * `categoryOrder`.
   *
   * @param category - The category to look up.
   * @returns The zero-based rank, or `null` if not in the order.
   */
  getCategoryRank(category: string): number | null

  /**
   * Returns the next-up category in the upgrade order, or `null` if the
   * category is already at the top.
   *
   * @param category - The starting category.
   * @returns The next category up, or `null` at the top of the order.
   */
  getNextCategory(category: string): string | null
}
```

#### `UserPlanFields`

Minimal user record shape consumed by the plan cache. Only the fields
needed to derive the effective plan key are required; concrete user
resources may have many more fields.

```typescript
interface UserPlanFields {
  /** The user's stored plan key, or `null`/empty for free tier. */
  planKey?: string | null

  /** ISO timestamp at which the current plan expires; expired plans fall back to default. */
  planExpiresAt?: string | null

  /** Whether the user is anonymous; anonymous users get the `'anonymous'` plan key. */
  isAnonymous?: boolean
}
```

### Types

#### `LimitType`

Identifies the kind of limit that triggered a 429-style entitlement error.
Apps may extend this with domain-specific keys via module augmentation.

```typescript
type LimitType = string
```

#### `RequestHandler`

Express-compatible request handler.

```typescript
type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>
```

### Functions

#### `buildLimitError(options)`

Build a `LimitErrorPayload` describing a tier-limit violation.

Reads the bonded entitlements registry to resolve the next-up category and
(optionally) the upgraded limit value. Anonymous users are flagged with
`requiresSignup: true` so the client can offer a sign-up prompt rather than
an upgrade prompt.

```typescript
function buildLimitError(options: BuildLimitErrorOptions<TLimits>): LimitErrorPayload
```

- `options` — The limit type, current tier category, current limit, and

**Returns:** A structured payload safe to send as a 429 / 403 response body.

#### `clearPlanCache()`

Drops every cached plan-key entry. Intended for tests and graceful
shutdown — production code should not need to call this.

```typescript
function clearPlanCache(): void
```

#### `configurePlanCache(options)`

Reconfigures the plan cache. Existing entries remain; only future
insertions and TTL checks observe the new settings.

```typescript
function configurePlanCache(options?: PlanCacheOptions): void
```

- `options` — Optional overrides for TTL and maxEntries.

#### `defineTiers(options)`

Constructs a `TierRegistry` from a tier record and category order.

Validates that the `defaultPlanKey` exists in the `tiers` record and that
every tier's `category` appears in `categoryOrder`. Throws synchronously
on misconfiguration so problems surface at startup, not at request time.

```typescript
function defineTiers(options: DefineTiersOptions<TLimits>): TierRegistry<TLimits>
```

- `options` — The tier set, default plan key, and category upgrade order.

**Returns:** A typed tier registry suitable for `setProvider(...)`.

#### `enforceLimit(options)`

Creates middleware that allows the request only when the user is below
their tier limit for the given resource. The user's tier `limits` object
supplies the cap, and the caller-supplied `getCurrent` function counts
the current usage.

```typescript
function enforceLimit(options: EnforceLimitOptions<TLimits>): RequestHandler
```

- `options` — The limit type, limit accessor, and current-usage accessor.

**Returns:** An Express request handler.

#### `getCachedPlanKey(userId)`

Resolve the effective plan key for a user, hitting the cache on warm reads
and falling back to a DB lookup on cache miss.

The effective plan key:
- Returns `'anonymous'` for users flagged as anonymous, regardless of stored plan.
- Returns `null` for users whose `planExpiresAt` is in the past — callers
  should treat this as the default tier.
- Returns the stored plan key otherwise (or `null` if none was stored).

```typescript
function getCachedPlanKey(userId: string): Promise<string | null>
```

- `userId` — The user ID to look up.

**Returns:** The effective plan key, or `null` for default-tier users.

#### `getEffectiveTier(res)`

Resolves the effective tier for the user attached to the request via
`res.locals.session.userId`. Falls back to the registry's default tier
when no user is on the request, when the user record cannot be found, or
when the stored plan has expired.

```typescript
function getEffectiveTier(res: Response): Promise<Tier<TLimits>>
```

- `res` — The response object whose `locals.session.userId` identifies the user.

**Returns:** The user's effective tier.

#### `getProvider()`

Retrieves the bonded tier registry, throwing if none is configured.

The generic parameter is the caller's responsibility — entitlements is
inherently app-specific in its `TLimits` shape, and bonds are erased at
runtime. Callers should pass their app's `TLimits` type at the call site.

```typescript
function getProvider(): TierRegistry<TLimits>
```

**Returns:** The bonded tier registry.

#### `hasProvider()`

Checks whether an entitlements provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a tier registry is bonded.

#### `invalidateCachedPlanKey(userId)`

Invalidate a single user's cached plan-key entry. Call this immediately
after writing a new `planKey` / `planExpiresAt` to the user record (e.g.
from a webhook handler) so the next request reflects the change without
waiting out the TTL.

```typescript
function invalidateCachedPlanKey(userId: string): void
```

- `userId` — The user ID whose cache entry should be evicted.

#### `planCacheSize()`

Returns the number of currently cached entries. Mainly useful for tests
and operational metrics.

```typescript
function planCacheSize(): number
```

**Returns:** Current cache size.

#### `requireCategory(allowedCategories)`

Creates middleware that allows the request only when the user's tier
category is one of the listed values. Responds 401 if the request is
unauthenticated, 403 with a `LimitErrorPayload`-shaped body if the user's
tier is not in the list.

```typescript
function requireCategory(allowedCategories?: string[]): RequestHandler
```

- `allowedCategories` — The tier categories that are permitted (e.g. `['pro', 'team']`).

**Returns:** An Express request handler.

#### `requireCategoryAtLeast(minCategory)`

Creates middleware that allows the request only when the user's tier
rank is at least as high as the named category. Useful for "pro and above"
style gates without listing every category individually.

Apps must include all gated categories in `categoryOrder` when calling
`defineTiers(...)`; categories absent from the order produce `null` ranks
and therefore fail the check.

```typescript
function requireCategoryAtLeast(minCategory: string): RequestHandler
```

- `minCategory` — The minimum acceptable category.

**Returns:** An Express request handler.

#### `setProvider(provider)`

Registers a tier registry as the active entitlements provider.
Called by the application during startup.

```typescript
function setProvider(provider: TierRegistry<TLimits>): void
```

- `provider` — The tier registry to bond.

#### `sweepExpiredPlanCacheEntries()`

Sweep expired entries from the cache. Safe to call from a recurring
cleanup interval; idempotent and O(n) in cache size.

```typescript
function sweepExpiredPlanCacheEntries(): void
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-rate-limit` ^1.0.0
