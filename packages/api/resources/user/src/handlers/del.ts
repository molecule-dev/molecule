import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { PaymentRecordService } from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'

import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Deletes a user and their associated data. Removes secrets from the secrets table,
 * devices via the bonded DeviceService, and payment records via the bonded PaymentRecordService
 * before deleting the user row itself.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 200, body: { props: { id } } }` on success.
 */
export const del = ({ name: _name, tableName, schema: _schema }: types.Resource) => {
  return async (req: MoleculeRequest) => {
    try {
      const id = req.params.id as string

      // Delete secrets.
      await deleteById(`${tableName}Secrets`, id).catch((err) => {
        logger.warn('Failed to delete user secrets', { userId: id, error: err })
      })

      // Delete devices via bond.
      await get<{ deleteByUserId(userId: string): Promise<void> }>('device')?.deleteByUserId(id)

      // Delete payments via bond.
      await get<PaymentRecordService>('paymentRecords')?.deleteByUserId(id)

      // Delete user.
      const result = await deleteById(tableName, id)

      if (!result?.affected) {
        return {
          statusCode: 404,
          body: { error: t('user.error.notFound'), errorKey: 'user.error.notFound' },
        }
      }

      analytics.track({ name: 'user.deleted', userId: id }).catch(() => {})

      return { statusCode: 200, body: { props: { id } } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('user.error.failedToDeleteUser'),
          errorKey: 'user.error.failedToDeleteUser',
        },
      }
    }
  }
}
