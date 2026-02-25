/**
 * Get uptime statistics for services.
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
 * Returns uptime window statistics for all services, or filtered by
 * `?serviceId=` query parameter for a specific service.
 *
 * @param _resource - The service resource configuration (unused).
 * @param _resource.tableName - The database table name for services.
 * @returns A request handler that responds with uptime window records.
 */
export const getUptime = ({ tableName: _tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest) => {
    try {
      const where: WhereCondition[] = []

      const serviceId = req.query.serviceId as string | undefined
      if (serviceId) {
        where.push({ field: 'serviceId', operator: '=', value: serviceId })
      }

      const windows = await findMany<types.UptimeWindowProps>('uptimeWindows', {
        where: where.length > 0 ? where : undefined,
        orderBy: [{ field: 'serviceId', direction: 'asc' }],
      })

      return {
        statusCode: 200,
        body: Array.isArray(windows) ? windows : [],
      }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.getUptimeFailed'),
          errorKey: 'status.error.getUptimeFailed',
        },
      }
    }
  }
}
