/**
 * Update an existing incident (admin).
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import { updateIncidentPropsSchema } from '../schema.js'
import type * as types from '../types.js'

const logger = getLogger()

/**
 * Updates an existing incident by ID. Validates the request body against
 * the update incident schema (all fields optional) before patching.
 *
 * @param _resource - The service resource configuration (unused).
 * @param _resource.tableName - The database table name for services.
 * @returns A request handler that updates an incident and responds with the updated record.
 */
export const updateIncident = ({ tableName: _tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest) => {
    const id = String(req.params.id)

    try {
      const existing = await findById<types.IncidentProps>('incidents', id)
      if (!existing) {
        return {
          statusCode: 404,
          body: {
            error: t('status.error.incidentNotFound'),
            errorKey: 'status.error.incidentNotFound',
          },
        }
      }

      const parsed = updateIncidentPropsSchema.safeParse(req.body)
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

      const result = await updateById<types.IncidentProps>('incidents', id, data)

      logger.debug('Incident updated', { id })
      return { statusCode: 200, body: { props: result.data } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.updateIncidentFailed'),
          errorKey: 'status.error.updateIncidentFailed',
        },
      }
    }
  }
}
