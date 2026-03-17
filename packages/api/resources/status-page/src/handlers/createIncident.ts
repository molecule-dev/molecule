/**
 * Create a new incident (admin).
 *
 * @module
 */

import { getAnalytics, getLogger } from '@molecule/api-bond'
import { create } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import { createIncidentPropsSchema } from '../schema.js'
import type * as types from '../types.js'

const logger = getLogger()
const analytics = getAnalytics()

/**
 * Creates a new incident record. Validates the request body against
 * the create incident schema before inserting.
 *
 * @param _resource - The service resource configuration (unused).
 * @param _resource.tableName - The database table name for services.
 * @returns A request handler that creates an incident and responds with the created record.
 */
export const createIncident = ({ tableName: _tableName }: { tableName: string }) => {
  return async (req: MoleculeRequest) => {
    try {
      const parsed = createIncidentPropsSchema.safeParse(req.body)

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

      const result = await create<types.IncidentProps>('incidents', parsed.data)

      logger.debug('Incident created', { incidentId: result.data?.id })
      analytics
        .track({
          name: 'incident.created',
          properties: { incidentId: result.data?.id, serviceId: parsed.data.serviceId },
        })
        .catch(() => {})
      return { statusCode: 201, body: { props: result.data } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('status.error.createIncidentFailed'),
          errorKey: 'status.error.createIncidentFailed',
        },
      }
    }
  }
}
