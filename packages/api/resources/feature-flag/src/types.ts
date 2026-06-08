/**
 * Feature-flag domain types.
 *
 * @module
 */

/**
 * Discriminates the value type carried by a feature flag.
 */
export type FlagType = 'boolean' | 'multivariate' | 'string' | 'number'
/**
 * Lifecycle state of a feature flag (active, disabled, killed, or time-gated).
 */
export type FlagState = 'on' | 'off' | 'killed' | 'scheduled'

/**
 * Database row shape for a feature flag definition.
 */
export interface FeatureFlagRow {
  id: string
  user_id: string
  project_id: string | null
  key: string
  name: string
  description: string | null
  flag_type: FlagType
  default_value: unknown
  rollout_percentage: number
  is_enabled: boolean
  state: FlagState
  environment: string
  stale_days: number
  created_at: string | Date
  updated_at: string | Date
}

/**
 * Database row shape for a targeting rule that overrides a flag's value for matching users.
 */
export interface FeatureFlagTargetingRuleRow {
  id: string
  flag_id: string
  attribute: string
  operator: string
  value: unknown
  serve_value: unknown
  priority: number
  description: string | null
  created_at: string | Date
}
