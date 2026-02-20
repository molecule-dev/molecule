/**
 * Aggregated system health status handler.
 *
 * Returns the overall system status by examining the latest check
 * for each enabled service. If all services are up, the system is
 * operational. If any are degraded, the system is degraded. If any
 * are down, the system is down.
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
 * Returns the aggregated system health status.
 *
 * Finds all enabled services, fetches the latest check for each,
 * and computes an overall status: `operational`, `degraded`, or `down`.
 *
 * @param resource - The service resource configuration.
 * @param resource.tableName - The database table name for services.
 * @returns A request handler that responds with overall system status.
 */
export const getStatus = ({ tableName }: { tableName: string }) => {
  return async (_req: MoleculeRequest) => {
    try {
      const services = await findMany<types.ServiceProps>(tableName, {
        where: [{ field: 'enabled', operator: '=', value: true }] as WhereCondition[],
        orderBy: [{ field: 'name', direction: 'asc' }],
      })

      const serviceList = Array.isArray(services) ? services : []

      const serviceStatuses: Array<{
        id: string
        name: string
        status: string
        latencyMs: number | null
      }> = []

      for (const service of serviceList) {
        const checks = await findMany<types.CheckProps>('checks', {
          where: [{ field: 'serviceId', operator: '=', value: service.id }] as WhereCondition[],
          orderBy: [{ field: 'checkedAt', direction: 'desc' }],
          limit: 1,
        })
        const latestCheck = checks[0] ?? null

        serviceStatuses.push({
          id: service.id,
          name: service.name,
          status: latestCheck?.status ?? 'unknown',
          latencyMs: latestCheck?.latencyMs ?? null,
        })
      }

      let overall: 'operational' | 'degraded' | 'down' = 'operational'
      if (serviceStatuses.some((s) => s.status === 'down')) {
        overall = 'down'
      } else if (serviceStatuses.some((s) => s.status === 'degraded')) {
        overall = 'degraded'
      }

      return {
        statusCode: 200,
        body: {
          status: overall,
          services: serviceStatuses,
          checkedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.getStatusFailed'),
          errorKey: 'status.error.getStatusFailed',
        },
      }
    }
  }
}
