import { getAnalytics, getLogger } from '@molecule/api-bond'
import { get } from '@molecule/api-config'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'

import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for two-factor authentication operations (setup, enable, or disable). */
export interface VerifyTwoFactorRequest extends MoleculeRequest {
  body: {
    token?: string
    action?: 'setup' | 'enable' | 'disable'
  }
}

/**
 * Handles two-factor authentication lifecycle via `@molecule/api-two-factor`:
 * - `setup`: Generates a TOTP secret and returns QR code URLs for authenticator apps.
 * - `enable`: Verifies a TOTP token against the pending secret, then activates 2FA.
 * - `disable`: Verifies a TOTP token against the active secret, then deactivates 2FA.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler for two-factor authentication operations.
 */
export const verifyTwoFactor = ({ name: _name, tableName, schema: _schema }: types.Resource) => {
  return async (req: VerifyTwoFactorRequest) => {
    try {
      const id = req.params.id as string
      const { token, action } = req.body

      // Get user secrets.
      const secrets = await findById<types.SecretProps>(`${tableName}Secrets`, id)

      if (!secrets) {
        return {
          statusCode: 404,
          body: { error: t('user.error.notFound'), errorKey: 'user.error.notFound' },
        }
      }

      const twoFactor = await import('@molecule/api-two-factor').catch(() => null)
      if (!twoFactor) {
        return {
          statusCode: 500,
          body: {
            error: t('user.error.twoFactorNotAvailable'),
            errorKey: 'user.error.twoFactorNotAvailable',
          },
        }
      }

      if (action === 'setup') {
        // Generate a new secret and return QR code.
        const secret = twoFactor.generateSecret()

        // Store as pending secret.
        await updateById(`${tableName}Secrets`, id, { pendingTwoFactorSecret: secret })

        const appName = get('APP_NAME', 'App') ?? 'App'
        const user = await findById<types.Props>(tableName, id)

        const urls = await twoFactor.getUrls({
          username: user?.username || id,
          service: appName,
          secret,
        })

        return { statusCode: 200, body: { ...urls, secret } }
      }

      if (action === 'enable') {
        if (!token) {
          return {
            statusCode: 400,
            body: { error: t('user.error.tokenRequired'), errorKey: 'user.error.tokenRequired' },
          }
        }

        if (!secrets.pendingTwoFactorSecret) {
          return {
            statusCode: 400,
            body: {
              error: t('user.error.noPendingTwoFactorSetup'),
              errorKey: 'user.error.noPendingTwoFactorSetup',
            },
          }
        }

        // Verify the token against the pending secret.
        const isValid = await twoFactor.verify({
          secret: secrets.pendingTwoFactorSecret,
          token,
        })

        if (!isValid) {
          return {
            statusCode: 403,
            body: { error: t('user.error.invalidToken'), errorKey: 'user.error.invalidToken' },
          }
        }

        // Move pending secret to active and enable 2FA.
        await updateById(`${tableName}Secrets`, id, {
          twoFactorSecret: secrets.pendingTwoFactorSecret,
          pendingTwoFactorSecret: null,
        })

        await updateById(tableName, id, {
          twoFactorEnabled: true,
          updatedAt: new Date().toISOString(),
        })

        analytics.track({ name: 'user.two_factor_enabled', userId: id }).catch(() => {})

        return { statusCode: 200, body: { twoFactorEnabled: true } }
      }

      if (action === 'disable') {
        if (!token) {
          return {
            statusCode: 400,
            body: { error: t('user.error.tokenRequired'), errorKey: 'user.error.tokenRequired' },
          }
        }

        if (!secrets.twoFactorSecret) {
          return {
            statusCode: 400,
            body: {
              error: t('user.error.twoFactorNotEnabled'),
              errorKey: 'user.error.twoFactorNotEnabled',
            },
          }
        }

        // Verify the token against the current secret.
        const isValid = await twoFactor.verify({
          secret: secrets.twoFactorSecret,
          token,
        })

        if (!isValid) {
          return {
            statusCode: 403,
            body: { error: t('user.error.invalidToken'), errorKey: 'user.error.invalidToken' },
          }
        }

        // Disable 2FA.
        await updateById(`${tableName}Secrets`, id, {
          twoFactorSecret: null,
          pendingTwoFactorSecret: null,
        })

        await updateById(tableName, id, {
          twoFactorEnabled: false,
          updatedAt: new Date().toISOString(),
        })

        analytics.track({ name: 'user.two_factor_disabled', userId: id }).catch(() => {})

        return { statusCode: 200, body: { twoFactorEnabled: false } }
      }

      return {
        statusCode: 400,
        body: { error: t('user.error.invalidAction'), errorKey: 'user.error.invalidAction' },
      }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('user.error.twoFactorOperationFailed'),
          errorKey: 'user.error.twoFactorOperationFailed',
        },
      }
    }
  }
}
