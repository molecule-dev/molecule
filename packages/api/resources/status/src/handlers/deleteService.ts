/**
 * Delete a monitored service (admin).
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { deleteById, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import type * as types from '../types.js'

const logger = getLogger()

/**
 * Deletes a monitored service by ID. Returns 404 if the service does not exist.
 * Associated checks, incidents, and uptime windows are removed via CASCADE.
 *
 * @param resource - The service resource configuration.
 * @param resource.tableName - The database table name for services.
 * @returns A request handler that deletes a service and responds with 204 on success.
 */
export const deleteService = ({ tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest) => {
    const id = String(req.params.id)

    try {
      const existing = await findById<types.ServiceProps>(tableName, id)
      if (!existing) {
        return {
          statusCode: 404,
          body: {
            error: t('status.error.serviceNotFound'),
            errorKey: 'status.error.serviceNotFound',
          },
        }
      }

      await deleteById(tableName, id)

      logger.debug('Service deleted', { id })
      return { statusCode: 200, body: { props: { id } } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.deleteServiceFailed'),
          errorKey: 'status.error.deleteServiceFailed',
        },
      }
    }
  }
}
