import { getLogger } from '@molecule/api-bond'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
const logger = getLogger()
import { t } from '@molecule/api-i18n'

import type * as types from '../types.js'

/**
 * Queries all devices belonging to the authenticated user. Supports pagination via `before`/`after`
 * cursor filters on `createdAt`/`updatedAt`, configurable `limit` (1–10000, default 100), and
 * `orderBy`/`orderDirection` params. Sorts the current session's device to the front of results
 * and marks it with `isCurrent: true`.
 * @param resource - The device resource configuration (tableName).
 * @param resource.tableName - The database table name for devices.
 * @returns A request handler that responds with an array of device props.
 */
export const query =
  ({ tableName }: { tableName: string }) =>
  async (req: MoleculeRequest, res: MoleculeResponse) => {
    try {
      const session = res.locals.session as { userId: string; deviceId: string }
      const userId = session?.userId
      const deviceId = session?.deviceId

      if (!userId) {
        return {
          statusCode: 403,
          body: { error: t('device.error.unauthorized'), errorKey: 'device.error.unauthorized' },
        }
      }

      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 10000)
      const orderByField = req.query.orderBy === 'createdAt' ? 'createdAt' : 'updatedAt'
      const orderDirection = req.query.orderDirection === 'asc' ? 'asc' : ('desc' as const)

      // Build database-agnostic where conditions.
      const where: WhereCondition[] = [{ field: 'userId', operator: '=', value: userId }]

      const before = req.query.before as Record<string, string> | undefined
      if (before) {
        for (const [key, value] of Object.entries(before)) {
          if (value && (key === 'createdAt' || key === 'updatedAt')) {
            where.push({ field: key, operator: '<', value: String(value) })
          }
        }
      }

      const after = req.query.after as Record<string, string> | undefined
      if (after) {
        for (const [key, value] of Object.entries(after)) {
          if (value && (key === 'createdAt' || key === 'updatedAt')) {
            where.push({ field: key, operator: '>', value: String(value) })
          }
        }
      }

      const orderBy: OrderBy[] = [{ field: orderByField, direction: orderDirection }]

      // Query the database via the bonded DataStore.
      const devices = await findMany<types.Props & { isCurrent?: boolean }>(tableName, {
        where,
        orderBy,
        limit,
      })

      if (Array.isArray(devices)) {
        // Sort current device to front (replaces the old PostgreSQL CASE ordering).
        const currentIdx = devices.findIndex((d) => d.id === deviceId)
        if (currentIdx > 0) {
          const [current] = devices.splice(currentIdx, 1)
          devices.unshift(current)
        }

        if (devices[0]?.id === deviceId) {
          devices[0].isCurrent = true
        }
        return { statusCode: 200, body: devices }
      }
    } catch (error) {
      logger.error(error)
    }

    return {
      statusCode: 400,
      body: { error: t('device.error.badRequest'), errorKey: 'device.error.badRequest' },
    }
  }
