/**
 * Types of `@molecule/app-feature-flag-row-angular` — the Angular counterpart
 * of `@molecule/app-feature-flag-row-react`, same props and DOM.
 *
 * @module
 */

/** Discriminant for the kind of feature flag (boolean, multivariate, percentage rollout, or string variant). */
export type FlagType = 'boolean' | 'multivariate' | 'percentage' | 'string'

/**
 * Per-environment state for a feature flag, including enabled status and
 * optional rollout percentage.
 */
export interface FeatureFlagEnvironment {
  /** Environment id (e.g. "production", "staging"). */
  id: string
  /**
   * Display label — a string, or a projected template (a `{ $nodes }` value
   * inside a data prop arrives as a `TemplateRef`).
   */
  label: unknown
  /** Enabled in this env. */
  enabled: boolean
  /** Rollout percentage 0-100. Optional — render when `type='percentage'`. */
  rolloutPct?: number
}

/**
 * Complete definition of a feature flag including its key, display name, type,
 * and per-environment configuration. Node-valued fields (`name`,
 * `description`, `environments[].label`) are strings or projected templates.
 */
export interface FeatureFlag {
  /** Stable machine key (also the switch's `aria-label` prefix). */
  key: string
  /** Display name — a string or a projected template. */
  name: unknown
  /** Optional tagline — a string or a projected template. */
  description?: unknown
  /** The kind of flag. */
  type: FlagType
  /** One entry per environment. */
  environments: FeatureFlagEnvironment[]
}

/**
 * Props accepted by {@link FeatureFlagRow} — the same props
 * `@molecule/app-feature-flag-row-react` accepts.
 */
export interface FeatureFlagRowProps {
  /** The flag to render. */
  flag: FeatureFlag
  /** Called when an environment toggles. */
  onToggle: (flagKey: string, envId: string, next: boolean) => void
  /** Extra classes. */
  className?: string
}
