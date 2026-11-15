/**
 * Types of `@molecule/app-feature-flag-row-solid` — the Solid counterpart of
 * `@molecule/app-feature-flag-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Discriminant for the kind of feature flag (boolean, multivariate, percentage rollout, or string variant). */
export type FlagType = 'boolean' | 'multivariate' | 'percentage' | 'string'

/** Per-environment state for a feature flag, including enabled status and optional rollout percentage. */
export interface FeatureFlagEnvironment {
  /** Environment id (e.g. "production", "staging"). */
  id: string
  /** Display label. */
  label: JSX.Element
  /** Enabled in this env. */
  enabled: boolean
  /** Rollout percentage 0-100. Optional — render when `type='percentage'`. */
  rolloutPct?: number
}

/** Complete definition of a feature flag including its key, display name, type, and per-environment configuration. */
export interface FeatureFlag {
  /** Stable machine key (also the switch's `aria-label` prefix). */
  key: string
  /** Display name. */
  name: JSX.Element
  /** Optional tagline. */
  description?: JSX.Element
  /** The kind of flag. */
  type: FlagType
  /** One entry per environment. */
  environments: FeatureFlagEnvironment[]
}

/** Props accepted by {@link FeatureFlagRow}. */
export interface FeatureFlagRowProps {
  /** The flag to render. */
  flag: FeatureFlag
  /** Called when an environment toggles. */
  onToggle: (flagKey: string, envId: string, next: boolean) => void
  /** Extra classes. */
  className?: string
}
