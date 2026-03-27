/**
 * Database-backed implementation of `FeatureFlagProvider`.
 *
 * Persists feature flags using the abstract `DataStore` from
 * `@molecule/api-database`. Supports rule-based targeting, percentage
 * rollouts, and bulk user evaluation.
 *
 * @module
 */

import {
  create,
  deleteById,
  findMany,
  updateById,
  type FindManyOptions,
} from '@molecule/api-database'
import type {
  FeatureFlag,
  FeatureFlagProvider,
  FeatureFlagUpdate,
  FlagContext,
  FlagRule,
} from '@molecule/api-feature-flags'

import type { DatabaseFlagConfig } from './types.js'

/** Default table name for feature flags. */
const DEFAULT_TABLE = 'feature_flags'

/** Database row shape for feature flag records. */
interface FlagRow {
  id: string
  name: string
  enabled: number | boolean
  description: string | null
  rules: string | null
  percentage: number | null
  created_at: string
  updated_at: string
}

/**
 * Converts a database row into a `FeatureFlag`.
 *
 * @param row - The raw database row.
 * @returns A normalized `FeatureFlag`.
 */
const rowToFlag = (row: FlagRow): FeatureFlag => {
  const flag: FeatureFlag = {
    name: row.name,
    enabled: Boolean(row.enabled),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
  if (row.description !== null) flag.description = row.description
  if (row.rules !== null) flag.rules = JSON.parse(row.rules) as FlagRule[]
  if (row.percentage !== null) flag.percentage = row.percentage
  return flag
}

/**
 * Evaluates a single targeting rule against a context.
 *
 * @param rule - The rule to evaluate.
 * @param context - The evaluation context.
 * @returns `true` if the rule matches.
 */
const evaluateRule = (rule: FlagRule, context: FlagContext): boolean => {
  const attributes = context.attributes ?? {}
  const actual = attributes[rule.attribute]

  switch (rule.operator) {
    case 'eq':
      return actual === rule.value
    case 'neq':
      return actual !== rule.value
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(actual)
    case 'notIn':
      return Array.isArray(rule.value) && !rule.value.includes(actual)
    case 'gt':
      return typeof actual === 'number' && typeof rule.value === 'number' && actual > rule.value
    case 'lt':
      return typeof actual === 'number' && typeof rule.value === 'number' && actual < rule.value
    default:
      return false
  }
}

/**
 * Determines if a user falls within the percentage rollout using a
 * deterministic hash of the user ID and flag name.
 *
 * @param userId - The user identifier.
 * @param flagName - The flag name.
 * @param percentage - The rollout percentage (0–100).
 * @returns `true` if the user is within the rollout.
 */
const isInPercentage = (userId: string, flagName: string, percentage: number): boolean => {
  const key = `${userId}:${flagName}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  const bucket = Math.abs(hash) % 100
  return bucket < percentage
}

/**
 * Evaluates whether a flag is enabled for a given context.
 *
 * @param flag - The feature flag definition.
 * @param context - The evaluation context.
 * @returns `true` if the flag is enabled.
 */
const evaluateFlag = (flag: FeatureFlag, context?: FlagContext): boolean => {
  if (!flag.enabled) return false

  if (flag.rules && flag.rules.length > 0 && context) {
    const allMatch = flag.rules.every((rule) => evaluateRule(rule, context))
    if (!allMatch) return false
  }

  if (flag.percentage !== undefined && context?.userId) {
    return isInPercentage(context.userId, flag.name, flag.percentage)
  }

  return true
}

/**
 * Creates a database-backed feature flag provider.
 *
 * @param config - Optional provider configuration.
 * @returns A `FeatureFlagProvider` backed by the bonded `DataStore`.
 */
export const createProvider = (config?: DatabaseFlagConfig): FeatureFlagProvider => {
  const tableName = config?.tableName ?? DEFAULT_TABLE

  return {
    async isEnabled(flag: string, context?: FlagContext): Promise<boolean> {
      const rows = await findMany<FlagRow>(tableName, {
        where: [{ field: 'name', operator: '=', value: flag }],
        limit: 1,
      })

      if (rows.length === 0) return false
      return evaluateFlag(rowToFlag(rows[0]), context)
    },

    async getFlag(flag: string): Promise<FeatureFlag | null> {
      const rows = await findMany<FlagRow>(tableName, {
        where: [{ field: 'name', operator: '=', value: flag }],
        limit: 1,
      })

      if (rows.length === 0) return null
      return rowToFlag(rows[0])
    },

    async setFlag(flag: FeatureFlagUpdate): Promise<FeatureFlag> {
      const now = new Date().toISOString()

      const existing = await findMany<FlagRow>(tableName, {
        where: [{ field: 'name', operator: '=', value: flag.name }],
        limit: 1,
      })

      if (existing.length > 0) {
        const data: Record<string, unknown> = {
          enabled: flag.enabled,
          description: flag.description ?? null,
          rules: flag.rules ? JSON.stringify(flag.rules) : null,
          percentage: flag.percentage ?? null,
          updated_at: now,
        }
        await updateById(tableName, existing[0].id, data)

        return {
          name: flag.name,
          enabled: flag.enabled,
          description: flag.description,
          rules: flag.rules,
          percentage: flag.percentage,
          createdAt: new Date(existing[0].created_at),
          updatedAt: new Date(now),
        }
      }

      const id = crypto.randomUUID()
      const data: Record<string, unknown> = {
        id,
        name: flag.name,
        enabled: flag.enabled,
        description: flag.description ?? null,
        rules: flag.rules ? JSON.stringify(flag.rules) : null,
        percentage: flag.percentage ?? null,
        created_at: now,
        updated_at: now,
      }
      await create(tableName, data)

      return {
        name: flag.name,
        enabled: flag.enabled,
        description: flag.description,
        rules: flag.rules,
        percentage: flag.percentage,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }
    },

    async getAllFlags(): Promise<FeatureFlag[]> {
      const options: FindManyOptions = {
        orderBy: [{ field: 'name', direction: 'asc' }],
      }
      const rows = await findMany<FlagRow>(tableName, options)
      return rows.map(rowToFlag)
    },

    async deleteFlag(flag: string): Promise<void> {
      const rows = await findMany<FlagRow>(tableName, {
        where: [{ field: 'name', operator: '=', value: flag }],
        limit: 1,
      })

      if (rows.length === 0) {
        throw new Error(`Feature flag not found: ${flag}`)
      }

      await deleteById(tableName, rows[0].id)
    },

    async evaluateForUser(userId: string, flags?: string[]): Promise<Record<string, boolean>> {
      let rows: FlagRow[]

      if (flags && flags.length > 0) {
        rows = await findMany<FlagRow>(tableName, {
          where: [{ field: 'name', operator: 'in', value: flags }],
        })
      } else {
        rows = await findMany<FlagRow>(tableName, {})
      }

      const context: FlagContext = { userId }
      const result: Record<string, boolean> = {}

      for (const row of rows) {
        const flag = rowToFlag(row)
        result[flag.name] = evaluateFlag(flag, context)
      }

      return result
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: FeatureFlagProvider | null = null

/**
 * Default database feature flags provider instance. Lazily initializes
 * on first property access with default options.
 */
export const provider: FeatureFlagProvider = new Proxy({} as FeatureFlagProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
