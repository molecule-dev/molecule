import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { compare, hash } from '@molecule/api-password'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import type { DeviceService } from '@molecule/api-resource-device'

import { invalidateAllDeviceExistsCache } from '../authorization.js'
import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for password update, with current password verification and new password. */
export interface UpdatePasswordRequest extends MoleculeRequest {
  body: {
    currentPassword?: string
    newPassword?: string
  }
}

/**
 * Updates a user's password. If the user already has a password hash, the current password
 * must be provided and verified first. The new password is hashed via `@molecule/api-password`
 * and stored in the secrets table.
 *
 * **Every OTHER session is revoked; the caller's own is kept.** The device rows of all other
 * devices are deleted, so a stolen token on another device dies — but the device this request
 * arrived on stays, and the token that made the request (the `Authorization` header the client
 * is holding) keeps working. A RealWorld-style suite changes the password and then keeps using
 * the same token for the next request; revoking the caller too is what answered its second
 * `PUT /user` with 401 (xr-flash-m167, ~2 min lost). Do not fold a per-user secret into the
 * JWT: the device row is the revocation lever. A caller with no session (a handler invoked
 * outside a request) falls back to revoking every device.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 200, body: { success: true } }` on success.
 */
export const updatePassword = ({ name: _name, tableName, schema: _schema }: types.Resource) => {
  return async (req: UpdatePasswordRequest, res?: MoleculeResponse) => {
    try {
      const id = req.params.id
      const { currentPassword, newPassword } = req.body

      if (!newPassword) {
        return {
          statusCode: 400,
          body: {
            error: t('user.error.newPasswordRequired'),
            errorKey: 'user.error.newPasswordRequired',
          },
        }
      }

      if (newPassword.length < 8) {
        return {
          statusCode: 400,
          body: {
            error: t('user.error.passwordTooShort', undefined, {
              defaultValue: 'Password must be at least 8 characters',
            }),
            errorKey: 'user.error.passwordTooShort',
          },
        }
      }

      if (newPassword.length > 1024) {
        return {
          statusCode: 400,
          body: {
            error: t('user.error.passwordTooLong', undefined, {
              defaultValue: 'Password must be at most 1024 characters',
            }),
            errorKey: 'user.error.passwordTooLong',
          },
        }
      }

      // Get current password hash.
      const secrets = await findById<types.SecretProps>(`${tableName}Secrets`, id)

      // If user has a password, verify the current one.
      if (secrets?.passwordHash) {
        if (!currentPassword) {
          return {
            statusCode: 400,
            body: {
              error: t('user.error.currentPasswordRequired'),
              errorKey: 'user.error.currentPasswordRequired',
            },
          }
        }

        const isValid = await compare(currentPassword, secrets.passwordHash)
        if (!isValid) {
          return {
            statusCode: 403,
            body: {
              error: t('user.error.currentPasswordIncorrect'),
              errorKey: 'user.error.currentPasswordIncorrect',
            },
          }
        }
      }

      // Hash and store the new password, and clear any outstanding reset token.
      const passwordHash = await hash(newPassword)
      await updateById(`${tableName}Secrets`, id, {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenAt: null,
      })

      // Revoke the user's sessions — every device EXCEPT the one this request
      // arrived on. That kills a compromised session elsewhere while the token the
      // caller is holding stays valid, which is what lets a client change its own
      // password and keep making authenticated requests. With no session (a handler
      // invoked outside a request) there is no device to spare, so revoke all.
      const currentDeviceId = (res?.locals?.session as { deviceId?: string } | undefined)?.deviceId
      const deviceService = get<DeviceService>('device')
      try {
        if (currentDeviceId && typeof deviceService?.deleteOthersByUserId === 'function') {
          await deviceService.deleteOthersByUserId(id, currentDeviceId)
        } else {
          await deviceService?.deleteByUserId(id)
        }
        // Evict this process's positive device-exists cache so no just-deleted
        // device keeps authenticating for the cache TTL — immediate revocation.
        invalidateAllDeviceExistsCache()
      } catch (error) {
        // Non-critical — password was already changed successfully
        logger.warn('Failed to invalidate sessions after password change', { error, userId: id })
      }

      analytics.track({ name: 'user.password_changed', userId: id }).catch(() => {})

      return { statusCode: 200, body: { success: true } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('user.error.failedToUpdatePassword'),
          errorKey: 'user.error.failedToUpdatePassword',
        },
      }
    }
  }
}
