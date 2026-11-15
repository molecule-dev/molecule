/**
 * Types of `@molecule/app-feature-flag-row-svelte` — the Svelte counterpart of
 * `@molecule/app-feature-flag-row-react`: the same props (React names) and the
 * same DOM for the same input. Node-valued fields are snippets or plain
 * strings.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Discriminant for the kind of feature flag (boolean, multivariate, percentage rollout, or string variant). */
export type FlagType = 'boolean' | 'multivariate' | 'percentage' | 'string'

/** Per-environment state for a feature flag, including enabled status and optional rollout percentage. */
export interface FeatureFlagEnvironment {
  /** Environment id (e.g. "production", "staging"). */
  id: string
  /** Display label — a snippet or a plain string. */
  label: Snippet | string
  /** Enabled in this env. */
  enabled: boolean
  /** Rollout percentage 0-100. Optional — render when `type='percentage'`. */
  rolloutPct?: number
}

/** Complete definition of a feature flag including its key, display name, type, and per-environment configuration. */
export interface FeatureFlag {
  /** Stable machine key (also the switch's `aria-label` prefix). */
  key: string
  /** Display name — a snippet or a plain string. */
  name: Snippet | string
  /** Optional tagline — a snippet or a plain string. */
  description?: Snippet | string
  /** The kind of flag. */
  type: FlagType
  /** One entry per environment. */
  environments: FeatureFlagEnvironment[]
}

/** Props accepted by {@link FeatureFlagRow} (the `components.ts` export). */
export interface FeatureFlagRowProps {
  /** The flag to render. */
  flag: FeatureFlag
  /** Called when an environment toggles. */
  onToggle: (flagKey: string, envId: string, next: boolean) => void
  /** Extra classes. */
  className?: string
}
