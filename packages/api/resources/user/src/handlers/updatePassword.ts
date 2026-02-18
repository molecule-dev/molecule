import { getAnalytics, getLogger } from '@molecule/api-bond'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { compare, hash } from '@molecule/api-password'
import type { MoleculeRequest } from '@molecule/api-resource'

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
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 200, body: { success: true } }` on success.
 */
export const updatePassword = ({ name: _name, tableName, schema: _schema }: types.Resource) => {
  return async (req: UpdatePasswordRequest) => {
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

      // Hash and store the new password.
      const passwordHash = await hash(newPassword)
      await updateById(`${tableName}Secrets`, id, { passwordHash })

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
