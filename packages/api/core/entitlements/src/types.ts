/**
 * Type definitions for the entitlements core interface.
 *
 * Defines the shape of subscription tiers and the registry that resolves them
 * for a given plan key. Each application declares its own `TLimits` shape
 * (e.g. `maxProjects: number`, `maxOrdersPerMonth: number`) and constructs a
 * `TierRegistry<TLimits>` via the `defineTiers` helper.
 *
 * Tiers complement `@molecule/api-payments` `Plan` records:
 * - `Plan` provides Stripe-side metadata (price, productId, period, capabilities).
 * - `Tier<TLimits>` provides the quantitative limits enforced at runtime.
 *
 * Both are keyed by the same `planKey` strings.
 *
 * @module
 */

/**
 * A subscription tier with quantitative limits.
 *
 * Each application declares its own `TLimits` shape — for example, a personal
 * finance app might use `{ maxAccounts: number; maxTransactionsPerMonth: number }`
 * while a chat app might use `{ maxMessagesPerDay: number; maxParticipants: number }`.
 *
 * @template TLimits - Application-specific shape describing the quantitative limits.
 */
export interface Tier<TLimits = unknown> {
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

/**
 * Registry of all tiers defined by an application.
 *
 * Apps construct a `TierRegistry` via `defineTiers(...)` at startup and bond it
 * via `setProvider(registry)`. Middleware and handler code then look up the
 * tier for a given user via the bonded registry.
 *
 * @template TLimits - Application-specific shape describing the quantitative limits.
 */
export interface TierRegistry<TLimits = unknown> {
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

/**
 * Options for constructing a `TierRegistry` via `defineTiers`.
 *
 * @template TLimits - Application-specific shape describing the quantitative limits.
 */
export interface DefineTiersOptions<TLimits = unknown> {
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

/**
 * Identifies the kind of limit that triggered a 429-style entitlement error.
 * Apps may extend this with domain-specific keys via module augmentation.
 */
export type LimitType = string

/**
 * Structured payload returned to clients when a tier limit is exceeded.
 *
 * Frontends use this to render upgrade prompts that name the user's current
 * tier, the limit that was hit, and the next tier that would lift it.
 */
export interface LimitErrorPayload {
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

/**
 * Cached plan-key entry used by the plan cache to avoid a DB query on every
 * request. Bond packages and middleware should not depend on the cache shape
 * directly — use `getCachedPlanKey()` instead.
 */
export interface PlanCacheEntry {
  /** The cached plan key, or `null` for free/expired plans. */
  planKey: string | null

  /** Absolute timestamp (ms since epoch) at which this entry expires. */
  expiresAt: number
}

/**
 * Minimal user record shape consumed by the plan cache. Only the fields
 * needed to derive the effective plan key are required; concrete user
 * resources may have many more fields.
 */
export interface UserPlanFields {
  /** The user's stored plan key, or `null`/empty for free tier. */
  planKey?: string | null

  /** ISO timestamp at which the current plan expires; expired plans fall back to default. */
  planExpiresAt?: string | null

  /** Whether the user is anonymous; anonymous users get the `'anonymous'` plan key. */
  isAnonymous?: boolean
}
