import crypto from 'node:crypto'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { compare, hash } from '@molecule/api-password'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import type * as types from '../types.js'
import { normalizeEmail } from '../utilities/normalizeEmail.js'
import { notify } from '../utilities/notify.js'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Cached, real bcrypt hash used for the dummy compare on the user-not-found path.
 *
 * Computed lazily (not at import time) via the password bond — which honors the
 * configured cost (`SALT_ROUNDS`) — because the bond may not be wired when this
 * module loads. A previous implementation used a hardcoded literal that was
 * structurally malformed (54 chars after the cost prefix instead of 53), so
 * `compare()` short-circuited to `false` in ~0ms WITHOUT running the KDF,
 * defeating the timing-equalization defense and reintroducing a user-enumeration
 * oracle. Deriving the dummy hash from the bond's `hash()` guarantees it is
 * valid and matches the exact work factor of real password hashes.
 */
let dummyHash: string | undefined

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
        // Emails are stored normalized (lowercased) at signup — look them up the
        // same way, or a mixed-case login (`User@x.com`) never matches its stored
        // lowercase form and the user is locked out of their own account.
        const normalizedEmail = normalizeEmail(body.email)
        if (normalizedEmail) {
          user =
            (await findOne<types.Props>(tableName, [
              { field: 'email', operator: '=', value: normalizedEmail },
            ])) ?? undefined
        }
      }

      if (!user) {
        // Perform a dummy password compare to prevent timing-based user enumeration.
        // Without this, the ~100-300ms difference between "user not found" (instant)
        // and "wrong password" (bcrypt cost) reveals whether an account exists.
        // The dummy hash MUST be a real, correctly-costed hash so the KDF actually
        // runs at the same work factor as the wrong-password path (see dummyHash docs).
        if (body.password) {
          try {
            dummyHash ??= await hash('molecule-dummy-password')
            await compare(body.password, dummyHash)
          } catch (_error) {
            // Best-effort timing equalizer only: a hashing/compare failure must not
            // alter the response or surface an error — the not-found path always
            // returns the same generic invalid-credentials result below.
          }
        }
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

      // Try password reset token (constant-time comparison to prevent timing attacks).
      if (!authenticated && body.passwordResetToken && secrets.passwordResetToken) {
        const a = Buffer.from(body.passwordResetToken, 'utf-8')
        const b = Buffer.from(secrets.passwordResetToken, 'utf-8')
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
          // Check if the token is still valid (within 1 hour).
          if (secrets.passwordResetTokenAt) {
            const tokenAge = Date.now() - new Date(secrets.passwordResetTokenAt).getTime()
            if (tokenAge < 1000 * 60 * 60) {
              // Clear the reset token BEFORE granting auth to prevent concurrent
              // replay — two requests with the same token must not both succeed.
              await updateById(`${tableName}Secrets`, user.id, {
                passwordResetToken: null,
                passwordResetTokenAt: null,
              })
              authenticated = true
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
          const verifyResult = await twoFactor.verify({
            secret: secrets.twoFactorSecret,
            token: body.twoFactorToken,
            // Reject a code whose time step was already consumed (replay protection).
            afterTimeStep: secrets.lastTwoFactorTimeStep,
          })

          if (!verifyResult.valid) {
            analytics.track({ name: 'user.two_factor_failed', userId: user.id }).catch(() => {})
            return {
              statusCode: 403,
              body: {
                error: t('user.error.invalidTwoFactorToken'),
                errorKey: 'user.error.invalidTwoFactorToken',
              },
            }
          }

          // Persist the consumed time step so the same code cannot be replayed
          // on another session/endpoint within its validity window.
          if (verifyResult.timeStep !== undefined) {
            await updateById(`${tableName}Secrets`, user.id, {
              lastTwoFactorTimeStep: verifyResult.timeStep,
            })
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
      const accessToken = authorization.set(req, res, { userId: user.id, deviceId })

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

      return { statusCode: 200, body: { props: user, accessToken, user } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: { error: t('user.error.loginFailed'), errorKey: 'user.error.loginFailed' },
      }
    }
  }
}
