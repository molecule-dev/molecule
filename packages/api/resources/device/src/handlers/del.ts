import { getAnalytics, getLogger } from '@molecule/api-bond'
import { deleteById } from '@molecule/api-database'
import type { MoleculeRequest } from '@molecule/api-resource'
const analytics = getAnalytics()
const logger = getLogger()
import { t } from '@molecule/api-i18n'

/**
 * Deletes a device by ID from the database.
 * @param resource - The device resource configuration (name, tableName).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for devices.
 * @returns A request handler that responds with `{ statusCode: 200, body: { props: { id } } }` on success.
 */
export const del = ({ name: _name, tableName }: { name: string; tableName: string }) => {
  return async (req: MoleculeRequest) => {
    try {
      const id = String(req.params.id)
      const result = await deleteById(tableName, id)

      if (!result?.affected) {
        return {
          statusCode: 404,
          body: { error: t('device.error.notFound'), errorKey: 'device.error.notFound' },
        }
      }

      analytics.track({ name: 'device.deleted', properties: { deviceId: id } }).catch(() => {})
      return { statusCode: 200, body: { props: { id } } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 400,
        body: { error: t('device.error.badRequest'), errorKey: 'device.error.badRequest' },
      }
    }
  }
}
