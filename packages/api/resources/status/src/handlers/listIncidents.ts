/**
 * List incidents with optional filtering and pagination.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import type * as types from '../types.js'

const logger = getLogger()

/**
 * Lists incidents with support for `?status=` filtering and pagination
 * via `?limit=` and `?offset=` query parameters.
 *
 * @param _resource - The service resource configuration (unused).
 * @param _resource.tableName - The database table name for services.
 * @returns A request handler that responds with a paginated array of incidents.
 */
export const listIncidents = ({ tableName: _tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest) => {
    try {
      const where: WhereCondition[] = []

      const statusFilter = req.query.status as string | undefined
      if (statusFilter) {
        where.push({ field: 'status', operator: '=', value: statusFilter })
      }

      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000)
      const offset = Math.max(Number(req.query.offset) || 0, 0)

      const incidents = await findMany<types.IncidentProps>('incidents', {
        where: where.length > 0 ? where : undefined,
        orderBy: [{ field: 'startedAt', direction: 'desc' }],
        limit,
        offset,
      })

      return {
        statusCode: 200,
        body: Array.isArray(incidents) ? incidents : [],
      }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.listIncidentsFailed'),
          errorKey: 'status.error.listIncidentsFailed',
        },
      }
    }
  }
}
