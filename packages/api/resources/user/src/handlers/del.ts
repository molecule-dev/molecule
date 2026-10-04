import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { PaymentRecordService } from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'

import { invalidateAllDeviceExistsCache } from '../authorization.js'
import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Deletes a user and their associated data. Deletes the user row FIRST, then
 * the secrets, the devices (via the bonded DeviceService) and the payment
 * records (via the bonded PaymentRecordService).
 *
 * The row goes first so that a failed delete changes nothing: deleting the
 * secrets first meant a row delete that then failed left an account with no
 * password hash — no password sign-in, and a retried delete that no longer
 * asks for one. When the row delete fails nothing else has been touched; when
 * it succeeds, a failure in the clean-up after it leaves records that belong
 * to no account (logged), never an account without its password.
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

      // Delete the user row first — see the note above.
      const result = await deleteById(tableName, id)

      if (!result?.affected) {
        return {
          statusCode: 404,
          body: { error: t('user.error.notFound'), errorKey: 'user.error.notFound' },
        }
      }

      // Delete secrets.
      await deleteById(`${tableName}Secrets`, id).catch((err) => {
        logger.warn('Failed to delete user secrets', { userId: id, error: err })
      })

      // Delete devices via bond, then evict this process's positive
      // device-exists cache so any in-flight token for a just-deleted device is
      // rejected on its very next request (immediate in-process revocation).
      // Evicted even if the bond call fails: the user row is already gone.
      try {
        await get<{ deleteByUserId(userId: string): Promise<void> }>('device')?.deleteByUserId(id)
      } catch (err) {
        logger.warn('Failed to delete user devices', { userId: id, error: err })
      }
      invalidateAllDeviceExistsCache()

      // Delete payments via bond.
      await Promise.resolve(get<PaymentRecordService>('paymentRecords')?.deleteByUserId(id)).catch(
        (err) => {
          logger.warn('Failed to delete user payment records', { userId: id, error: err })
        },
      )

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
