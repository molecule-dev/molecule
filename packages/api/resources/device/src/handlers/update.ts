import { getAnalytics, getLogger } from '@molecule/api-bond'
import { updateById } from '@molecule/api-database'
import type { MoleculeRequest } from '@molecule/api-resource'
const analytics = getAnalytics()
const logger = getLogger()
import { t } from '@molecule/api-i18n'

/**
 * Updates a device's allowed fields: `name`, `pushPlatform`, `pushSubscription`, and
 * `hasPushSubscription`. Automatically sets `updatedAt` to the current timestamp.
 * @param resource - The device resource configuration (name, tableName).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for devices.
 * @returns A request handler that responds with the updated props on success.
 */
export const update = ({ name: _name, tableName }: { name: string; tableName: string }) => {
  return async (req: MoleculeRequest) => {
    try {
      const id = String(req.params.id)
      const allowedKeys = ['name', 'pushPlatform', 'pushSubscription', 'hasPushSubscription']
      const props: Record<string, unknown> = { updatedAt: new Date().toISOString() }

      for (const key of allowedKeys) {
        if (key in req.body) {
          props[key] = req.body[key]
        }
      }

      const result = await updateById(tableName, id, props)

      if (!result?.affected) {
        return {
          statusCode: 404,
          body: { error: t('device.error.notFound'), errorKey: 'device.error.notFound' },
        }
      }

      if ('pushSubscription' in req.body || 'hasPushSubscription' in req.body) {
        analytics
          .track({
            name: 'device.push_subscribed',
            properties: { deviceId: id, hasPushSubscription: props.hasPushSubscription },
          })
          .catch(() => {})
      }

      return { statusCode: 200, body: { props } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 400,
        body: { error: t('device.error.badRequest'), errorKey: 'device.error.badRequest' },
      }
    }
  }
}
