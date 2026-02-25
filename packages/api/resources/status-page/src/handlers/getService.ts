/**
 * Get a single service with its recent check history.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import type * as types from '../types.js'

const logger = getLogger()

/**
 * Returns a single service by ID along with the last 50 check results.
 *
 * @param resource - The service resource configuration.
 * @param resource.tableName - The database table name for services.
 * @returns A request handler that responds with a service and its recent checks.
 */
export const getService = ({ tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest) => {
    const id = String(req.params.id)

    try {
      const service = await findById<types.ServiceProps>(tableName, id)

      if (!service) {
        return {
          statusCode: 404,
          body: {
            error: t('status.error.serviceNotFound'),
            errorKey: 'status.error.serviceNotFound',
          },
        }
      }

      const recentChecks = await findMany<types.CheckProps>('checks', {
        where: [{ field: 'serviceId', operator: '=', value: id }] as WhereCondition[],
        orderBy: [{ field: 'checkedAt', direction: 'desc' }],
        limit: 50,
      })

      return {
        statusCode: 200,
        body: {
          props: {
            ...service,
            recentChecks: Array.isArray(recentChecks) ? recentChecks : [],
          },
        },
      }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.getServiceFailed'),
          errorKey: 'status.error.getServiceFailed',
        },
      }
    }
  }
}
