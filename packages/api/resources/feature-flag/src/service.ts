/**
 * Feature-flag service — pure data-access functions.
 *
 * @module
 */

import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

import type { FeatureFlagRow, FeatureFlagTargetingRuleRow, FlagState, FlagType } from './types.js'

const FLAGS_TABLE = 'feature_flags'
const RULES_TABLE = 'feature_flag_targeting_rules'

/** Returns a paginated list of feature flags owned by the given user, with optional project/environment/state filters. */
export async function listFlagsForUser(
  userId: string,
  opts: {
    page?: number
    limit?: number
    project_id?: string
    environment?: string
    state?: FlagState
  } = {},
): Promise<{ data: FeatureFlagRow[]; total: number; page: number; limit: number }> {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 50
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (opts.project_id) where.push({ field: 'project_id', operator: '=', value: opts.project_id })
  if (opts.environment) where.push({ field: 'environment', operator: '=', value: opts.environment })
  if (opts.state) where.push({ field: 'state', operator: '=', value: opts.state })

  const orderBy: OrderBy[] = [
    { field: 'updated_at', direction: 'desc' },
    { field: 'created_at', direction: 'desc' },
  ]
  const offset = (page - 1) * limit

  const [data, total] = await Promise.all([
    findMany<FeatureFlagRow>(FLAGS_TABLE, { where, orderBy, limit, offset }),
    count(FLAGS_TABLE, where),
  ])
  return { data, total, page, limit }
}

/** Fetches a single feature flag by ID, returning null if it does not exist or is not owned by the user. */
export async function getFlagForUser(
  flagId: string,
  userId: string,
): Promise<FeatureFlagRow | null> {
  const row = await findById<FeatureFlagRow>(FLAGS_TABLE, flagId)
  if (!row || row.user_id !== userId) return null
  return row
}

/** Creates a new feature flag owned by the given user and returns the persisted row. */
export async function createFlagForUser(
  userId: string,
  data: {
    project_id?: string
    key: string
    name: string
    description?: string
    flag_type?: FlagType
    default_value?: unknown
    rollout_percentage?: number
    is_enabled?: boolean
    environment?: string
    stale_days?: number
  },
): Promise<FeatureFlagRow> {
  const result = await create<FeatureFlagRow>(FLAGS_TABLE, {
    user_id: userId,
    project_id: data.project_id ?? null,
    key: data.key,
    name: data.name,
    description: data.description ?? null,
    flag_type: data.flag_type ?? 'boolean',
    default_value: data.default_value ?? false,
    rollout_percentage: data.rollout_percentage ?? 0,
    is_enabled: data.is_enabled ?? false,
    state: 'off',
    environment: data.environment ?? 'production',
    stale_days: data.stale_days ?? 30,
  } as Partial<FeatureFlagRow>)
  return result.data!
}

/** Applies a partial patch to a feature flag owned by the user and returns the updated row, or null if not found. */
export async function updateFlagForUser(
  flagId: string,
  userId: string,
  patch: Partial<{
    name: string
    description: string
    default_value: unknown
    rollout_percentage: number
    is_enabled: boolean
    state: FlagState
    environment: string
    stale_days: number
  }>,
): Promise<FeatureFlagRow | null> {
  const existing = await findById<FeatureFlagRow>(FLAGS_TABLE, flagId)
  if (!existing || existing.user_id !== userId) return null
  await updateById(FLAGS_TABLE, flagId, patch as Partial<FeatureFlagRow>)
  return await findById<FeatureFlagRow>(FLAGS_TABLE, flagId)
}

/** Deletes a feature flag owned by the user, returning true on success or false if not found. */
export async function deleteFlagForUser(flagId: string, userId: string): Promise<boolean> {
  const row = await findById<FeatureFlagRow>(FLAGS_TABLE, flagId)
  if (!row || row.user_id !== userId) return false
  await deleteById(FLAGS_TABLE, flagId)
  return true
}

/** Returns all targeting rules for a flag in priority order, or null if the flag is not found or not owned by the user. */
export async function listRulesForFlag(
  flagId: string,
  userId: string,
): Promise<FeatureFlagTargetingRuleRow[] | null> {
  const flag = await getFlagForUser(flagId, userId)
  if (!flag) return null
  return findMany<FeatureFlagTargetingRuleRow>(RULES_TABLE, {
    where: [{ field: 'flag_id', operator: '=', value: flagId }],
    orderBy: [{ field: 'priority', direction: 'asc' }],
  })
}

/** Appends a new targeting rule to a flag owned by the user and returns the persisted rule row. */
export async function addRuleToFlag(
  flagId: string,
  userId: string,
  data: {
    attribute: string
    operator: string
    value?: unknown
    serve_value?: unknown
    priority?: number
    description?: string
  },
): Promise<FeatureFlagTargetingRuleRow | null> {
  const flag = await getFlagForUser(flagId, userId)
  if (!flag) return null
  const result = await create<FeatureFlagTargetingRuleRow>(RULES_TABLE, {
    flag_id: flagId,
    attribute: data.attribute,
    operator: data.operator,
    value: data.value ?? null,
    serve_value: data.serve_value ?? null,
    priority: data.priority ?? 100,
    description: data.description ?? null,
  } as Partial<FeatureFlagTargetingRuleRow>)
  return result.data!
}

/** Deletes a targeting rule from a flag owned by the user, returning true on success or false if not found. */
export async function deleteRule(ruleId: string, flagId: string, userId: string): Promise<boolean> {
  const flag = await getFlagForUser(flagId, userId)
  if (!flag) return false
  const rule = await findById<FeatureFlagTargetingRuleRow>(RULES_TABLE, ruleId)
  if (!rule || rule.flag_id !== flagId) return false
  await deleteById(RULES_TABLE, ruleId)
  return true
}
