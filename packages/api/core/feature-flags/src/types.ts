/**
 * Type definitions for the feature flags core interface.
 *
 * Defines the `FeatureFlagProvider` interface for feature flag management
 * including flag evaluation, CRUD operations, rule-based targeting, and
 * percentage rollouts. Bond packages implement this interface to provide
 * concrete storage backends (database, in-memory, etc.).
 *
 * @module
 */

/**
 * Comparison operators for flag targeting rules.
 */
export type FlagOperator = 'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'lt'

/**
 * A targeting rule for a feature flag. Rules are evaluated against
 * the provided context to determine if a flag is enabled for a
 * specific user or request.
 */
export interface FlagRule {
  /** The context attribute to evaluate (e.g. 'plan', 'country'). */
  attribute: string

  /** The comparison operator. */
  operator: FlagOperator

  /** The value to compare against. */
  value: unknown
}

/**
 * Evaluation context for feature flag checks. Provides user identity
 * and arbitrary attributes for rule-based targeting.
 */
export interface FlagContext {
  /** The user identifier for user-specific targeting. */
  userId?: string

  /** Arbitrary attributes for rule evaluation. */
  attributes?: Record<string, unknown>
}

/**
 * A feature flag definition.
 */
export interface FeatureFlag {
  /** The unique flag name/key. */
  name: string

  /** Whether the flag is globally enabled. */
  enabled: boolean

  /** Human-readable description of the flag's purpose. */
  description?: string

  /** Targeting rules. When present, the flag is enabled only if all rules match. */
  rules?: FlagRule[]

  /** Percentage rollout (0–100). When set, only the given percentage of users see the flag. */
  percentage?: number

  /** When the flag was created. */
  createdAt: Date

  /** When the flag was last updated. */
  updatedAt: Date
}

/**
 * Payload for creating or updating a feature flag.
 */
export interface FeatureFlagUpdate {
  /** The unique flag name/key. */
  name: string

  /** Whether the flag is globally enabled. */
  enabled: boolean

  /** Human-readable description of the flag's purpose. */
  description?: string

  /** Targeting rules. */
  rules?: FlagRule[]

  /** Percentage rollout (0–100). */
  percentage?: number
}

/**
 * Feature flag provider interface.
 *
 * All feature flag providers must implement this interface to provide
 * flag evaluation, CRUD operations, rule-based targeting, and
 * percentage rollouts.
 */
export interface FeatureFlagProvider {
  /**
   * Checks whether a flag is enabled for the given context.
   * Evaluates targeting rules and percentage rollouts.
   *
   * @param flag - The flag name/key to check.
   * @param context - Optional evaluation context with user and attributes.
   * @returns `true` if the flag is enabled for the given context.
   */
  isEnabled(flag: string, context?: FlagContext): Promise<boolean>

  /**
   * Retrieves a flag definition by name.
   *
   * @param flag - The flag name/key.
   * @returns The flag definition, or `null` if not found.
   */
  getFlag(flag: string): Promise<FeatureFlag | null>

  /**
   * Creates or updates a feature flag.
   *
   * @param flag - The flag data to create or update.
   * @returns The created or updated flag definition.
   */
  setFlag(flag: FeatureFlagUpdate): Promise<FeatureFlag>

  /**
   * Retrieves all feature flags.
   *
   * @returns Array of all flag definitions.
   */
  getAllFlags(): Promise<FeatureFlag[]>

  /**
   * Deletes a feature flag.
   *
   * @param flag - The flag name/key to delete.
   */
  deleteFlag(flag: string): Promise<void>

  /**
   * Evaluates multiple flags for a specific user. Returns a map of
   * flag names to their enabled state.
   *
   * @param userId - The user identifier.
   * @param flags - Optional list of flag names to evaluate. If omitted, evaluates all flags.
   * @returns A record mapping flag names to their enabled state.
   */
  evaluateForUser(userId: string, flags?: string[]): Promise<Record<string, boolean>>
}
