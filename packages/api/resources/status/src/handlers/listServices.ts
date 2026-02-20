/**
 * List all monitored services with their latest check status.
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
 * Lists all services along with each service's latest check result.
 *
 * @param resource - The service resource configuration.
 * @param resource.tableName - The database table name for services.
 * @returns A request handler that responds with an array of services and their latest check.
 */
export const listServices = ({ tableName }: { tableName: string }) => {
  return async (_req: MoleculeRequest) => {
    try {
      const services = await findMany<types.ServiceProps>(tableName, {
        orderBy: [{ field: 'name', direction: 'asc' }],
      })

      const serviceList = Array.isArray(services) ? services : []

      const results = []
      for (const service of serviceList) {
        const checks = await findMany<types.CheckProps>('checks', {
          where: [{ field: 'serviceId', operator: '=', value: service.id }] as WhereCondition[],
          orderBy: [{ field: 'checkedAt', direction: 'desc' }],
          limit: 1,
        })
        const latestCheck = checks[0] ?? null

        results.push({
          ...service,
          latestCheck,
        })
      }

      return { statusCode: 200, body: results }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.listServicesFailed'),
          errorKey: 'status.error.listServicesFailed',
        },
      }
    }
  }
}
