/**
 * Update a monitored service (admin).
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import { updateServicePropsSchema } from '../schema.js'
import type * as types from '../types.js'

const logger = getLogger()

/**
 * Updates an existing monitored service by ID. Validates the request body
 * against the update service schema (all fields optional) before patching.
 *
 * @param resource - The service resource configuration.
 * @param resource.tableName - The database table name for services.
 * @returns A request handler that updates a service and responds with the updated record.
 */
export const updateService = ({ tableName }: { tableName: string }) => {
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

      const parsed = updateServicePropsSchema.safeParse(req.body)
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

      const data: Record<string, unknown> = {
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      }

      const result = await updateById<types.ServiceProps>(tableName, id, data)

      logger.debug('Service updated', { id })
      return { statusCode: 200, body: { props: result.data } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.updateServiceFailed'),
          errorKey: 'status.error.updateServiceFailed',
        },
      }
    }
  }
}
