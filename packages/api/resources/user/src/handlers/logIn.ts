import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { compare } from '@molecule/api-password'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import type * as types from '../types.js'
import { notify } from '../utilities/notify.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for user login, supporting password, reset token, and 2FA flows. */
export interface LogInRequest extends MoleculeRequest {
  body: {
    username?: string
    email?: string
    password?: string
    passwordResetToken?: string
    twoFactorToken?: string
    deviceName?: string
  }
}

/**
 * Logs in a user by username or email. Supports password authentication, password reset token
 * authentication (1-hour expiry), and optional two-factor verification via `@molecule/api-two-factor`.
 * On success, creates/updates a device via the bonded DeviceService, sets JWT authorization,
 * and notifies other devices about the new login.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 200, body: { props } }` on success,
 *   or `{ statusCode: 206, body: { twoFactorRequired: true } }` when 2FA is needed.
 */
export const logIn = ({ name: _name, tableName, schema: _schema }: types.Resource) => {
  return async (req: LogInRequest, res: MoleculeResponse) => {
    const { body } = req

    try {
      // Get the user by username or email.
      let user: types.Props | undefined

      if (body.username) {
        user =
          (await findOne<types.Props>(tableName, [
            { field: 'username', operator: '=', value: body.username },
          ])) ?? undefined
      } else if (body.email) {
        user =
          (await findOne<types.Props>(tableName, [
            { field: 'email', operator: '=', value: body.email },
          ])) ?? undefined
      }

      if (!user) {
        analytics
          .track({ name: 'user.login_failed', properties: { reason: 'invalid_credentials' } })
          .catch(() => {})
        return {
          statusCode: 403,
          body: {
            error: t('user.error.invalidCredentials'),
            errorKey: 'user.error.invalidCredentials',
          },
        }
      }

      // Get the user's secrets.
      const secrets = await findById<types.SecretProps>(`${tableName}Secrets`, user.id)

      if (!secrets) {
        return {
          statusCode: 403,
          body: {
            error: t('user.error.invalidCredentials'),
            errorKey: 'user.error.invalidCredentials',
          },
        }
      }

      let authenticated = false

      // Try password authentication.
      if (body.password && secrets.passwordHash) {
        authenticated = await compare(body.password, secrets.passwordHash)
      }

      // Try password reset token.
      if (!authenticated && body.passwordResetToken && secrets.passwordResetToken) {
        if (body.passwordResetToken === secrets.passwordResetToken) {
          // Check if the token is still valid (within 1 hour).
          if (secrets.passwordResetTokenAt) {
            const tokenAge = Date.now() - new Date(secrets.passwordResetTokenAt).getTime()
            if (tokenAge < 1000 * 60 * 60) {
              authenticated = true

              // Clear the reset token after use.
              await updateById(`${tableName}Secrets`, user.id, {
                passwordResetToken: null,
                passwordResetTokenAt: null,
              })
            }
          }
        }
      }

      if (!authenticated) {
        analytics
          .track({ name: 'user.login_failed', properties: { reason: 'invalid_credentials' } })
          .catch(() => {})
        return {
          statusCode: 403,
          body: {
            error: t('user.error.invalidCredentials'),
            errorKey: 'user.error.invalidCredentials',
          },
        }
      }

      // Check for two-factor authentication.
      if (user.twoFactorEnabled && secrets.twoFactorSecret) {
        if (!body.twoFactorToken) {
          analytics.track({ name: 'user.two_factor_required', userId: user.id }).catch(() => {})
          return { statusCode: 206, body: { twoFactorRequired: true } }
        }

        try {
          const twoFactor = await import('@molecule/api-two-factor')
          const isValid = await twoFactor.verify({
            secret: secrets.twoFactorSecret,
            token: body.twoFactorToken,
          })

          if (!isValid) {
            analytics.track({ name: 'user.two_factor_failed', userId: user.id }).catch(() => {})
            return {
              statusCode: 403,
              body: {
                error: t('user.error.invalidTwoFactorToken'),
                errorKey: 'user.error.invalidTwoFactorToken',
              },
            }
          }
        } catch (error) {
          logger.error('2FA verification failed:', error)
          return {
            statusCode: 500,
            body: {
              error: t('user.error.twoFactorVerificationUnavailable'),
              errorKey: 'user.error.twoFactorVerificationUnavailable',
            },
          }
        }
      }

      // Create or update device.
      const deviceId = await get<{
        createOrUpdate(userId: string, deviceName: string): Promise<string | null>
      }>('device')?.createOrUpdate(user.id, body.deviceName || 'Unknown')

      if (!deviceId) {
        return {
          statusCode: 500,
          body: {
            error: t('user.error.failedToCreateSession'),
            errorKey: 'user.error.failedToCreateSession',
          },
        }
      }

      // Set authorization.
      authorization.set(req, res, { userId: user.id, deviceId })

      // Notify other devices about the login.
      notify({
        userId: user.id,
        deviceId,
        title: t('user.notification.newLogin', undefined, {
          locale: ((user as Record<string, unknown>)?.locale as string) || 'en',
        }),
        titleKey: 'user.notification.newLogin',
        body: t(
          'user.notification.newLoginBody',
          { deviceName: body.deviceName || 'Unknown' },
          { locale: ((user as Record<string, unknown>)?.locale as string) || 'en' },
        ),
        bodyKey: 'user.notification.newLoginBody',
      }).catch(() => {})

      analytics
        .track({
          name: 'user.login',
          userId: user.id,
          properties: { method: body.passwordResetToken ? 'reset_token' : 'password' },
        })
        .catch(() => {})

      return { statusCode: 200, body: { props: user } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: { error: t('user.error.loginFailed'), errorKey: 'user.error.loginFailed' },
      }
    }
  }
}
