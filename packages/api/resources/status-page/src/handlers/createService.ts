/**
 * Create a new monitored service (admin).
 *
 * @module
 */

import { getAnalytics, getLogger } from '@molecule/api-bond'
import { create } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isStatusAdmin } from '../authorizers/index.js'
import { createServicePropsSchema } from '../schema.js'
import type * as types from '../types.js'

const logger = getLogger()
const analytics = getAnalytics()

/**
 * Creates a new monitored service. Validates the request body against
 * the create service schema before inserting into the database.
 *
 * @param resource - The service resource configuration.
 * @param resource.tableName - The database table name for services.
 * @returns A request handler that creates a service and responds with the created record.
 */
export const createService = ({ tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest, res: MoleculeResponse) => {
    // Defense-in-depth: deny anyone who isn't a status page admin, even if the
    // `requireAdmin` route middleware was stripped/omitted by the injector. The
    // status page is a public surface; an open create route lets anyone deface it.
    if (!(await isStatusAdmin(res))) {
      return {
        statusCode: 403,
        body: {
          error: t('status.error.forbidden', undefined, {
            defaultValue: 'Permission required to manage the status page',
          }),
          errorKey: 'status.error.forbidden',
        },
      }
    }

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
      analytics
        .track({ name: 'service.created', properties: { serviceId: result.data?.id } })
        .catch(() => {})
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
