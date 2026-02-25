/**
 * Create a new monitored service (admin).
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { create } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import { createServicePropsSchema } from '../schema.js'
import type * as types from '../types.js'

const logger = getLogger()

/**
 * Creates a new monitored service. Validates the request body against
 * the create service schema before inserting into the database.
 *
 * @param resource - The service resource configuration.
 * @param resource.tableName - The database table name for services.
 * @returns A request handler that creates a service and responds with the created record.
 */
export const createService = ({ tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest) => {
    try {
      const parsed = createServicePropsSchema.safeParse(req.body)

      if (!parsed.success) {
        const errors = parsed.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')
        return {
          statusCode: 400,
          body: {
            error: t('status.error.validationFailed', { errors }),
            errorKey: 'status.error.validationFailed',
          },
        }
      }

      const result = await create<types.ServiceProps>(tableName, parsed.data)

      logger.debug('Service created', { serviceId: result.data?.id })
      return { statusCode: 201, body: { props: result.data } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.createServiceFailed'),
          errorKey: 'status.error.createServiceFailed',
        },
      }
    }
  }
}
