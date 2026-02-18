/**
 * Resource query operation.
 *
 * @module
 */

import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'

import type { MoleculeRequest } from './http-types.js'
const logger = getLogger()
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import type * as types from './types.js'

/**
 * The available resource query options.
 *
 * @example `/api/resources?limit=100&orderBy=updatedAt&after[updatedAt]=2022-02-22T02:22:22.222Z`
 */
export interface Query {
  /**
   * The maximum number of query results.
   */
  limit?: number
  /**
   * An indexed property to order the results by.
   */
  orderBy?: `createdAt` | `updatedAt`
  /**
   * The direction to order the results.
   */
  orderDirection?: `asc` | `desc`
  /**
   * Constrains the results to values less than these properties, when provided.
   */
  before?: {
    /**
     * Constrains the results to resources created before the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    createdAt?: string
    /**
     * Constrains the results to resources updated before the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    updatedAt?: string
  }
  /**
   * Constrains the results to values greater than these properties, when provided.
   */
  after?: {
    /**
     * Constrains the results to resources created after the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    createdAt?: string
    /**
     * Constrains the results to resources updated after the provided timestamp.
     *
     * Usually an ISO 8601 timestamp.
     */
    updatedAt?: string
  }
}

/**
 * The resource query Zod schema.
 */
export const querySchema = z.object({
  limit: z.coerce.number().min(1).max(10000).default(100),
  orderBy: z.enum([`createdAt`, `updatedAt`]).default(`updatedAt`),
  orderDirection: z.enum([`asc`, `desc`]).default(`desc`),
  before: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
  after: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
})

type ValidatedQuery = z.infer<typeof querySchema>

/**
 * Creates a request handler to be used to query resources.
 *
 * Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.
 * @param resource - The resource descriptor.
 * @param resource.tableName - Database table to query resources from.
 * @returns A curried async handler that accepts a `MoleculeRequest` (with query params for pagination/sorting) and returns a `{ statusCode, body }` response.
 */
export const query =
  <
    Props extends types.Props = types.Props,
    QueriedResource extends types.Resource = types.Resource,
  >({
    tableName,
  }: QueriedResource) =>
  async (req: MoleculeRequest) => {
    try {
      // Validate the `req.query`.
      const result = querySchema.safeParse(req.query)

      if (!result.success) {
        // The provided `req.query` failed validation.
        const errors = result.error.issues
          .map((e) => `Query.${e.path.join('.')}: ${e.message}`)
          .join(', ')

        return { statusCode: 400, body: { error: errors, errorKey: 'resource.error.badRequest' } }
      }

      const query: ValidatedQuery = result.data

      // Build database-agnostic where conditions.
      const where: WhereCondition[] = []

      if (query.before) {
        for (const key in query.before) {
          if (query.before[key as keyof typeof query.before]) {
            where.push({
              field: key,
              operator: '<',
              value: query.before[key as keyof typeof query.before],
            })
          }
        }
      }

      if (query.after) {
        for (const key in query.after) {
          if (query.after[key as keyof typeof query.after]) {
            where.push({
              field: key,
              operator: '>',
              value: query.after[key as keyof typeof query.after],
            })
          }
        }
      }

      // Build database-agnostic ordering.
      const orderBy: OrderBy[] = [{ field: query.orderBy, direction: query.orderDirection }]

      // Query the database via the bonded DataStore.
      const resources = await findMany<Props>(tableName, {
        where: where.length > 0 ? where : undefined,
        orderBy,
        limit: query.limit,
      })

      if (Array.isArray(resources)) {
        // A valid response here should always be an array.
        return { statusCode: 200, body: resources }
      }
    } catch (error) {
      logger.error(error)
    }

    // If we made it here, something isn't quite right.
    return {
      statusCode: 400,
      body: {
        error: t('resource.error.badRequest', undefined, { defaultValue: 'Bad request.' }),
        errorKey: 'resource.error.badRequest',
      },
    }
  }
