import crypto from 'node:crypto'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { findById, findOne, updateMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { compare, hash } from '@molecule/api-password'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import type * as types from '../types.js'
import { hashResetToken } from '../utilities/hashResetToken.js'
import { normalizeEmail } from '../utilities/normalizeEmail.js'
import { notify } from '../utilities/notify.js'
import { stripSensitiveUserColumns } from '../utilities/stripSensitiveUserColumns.js'

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
      // Whether authentication came from the one-time reset token (as opposed
      // to a reusable password): its consumption is DEFERRED until every
      // challenge that can still bounce the request (the 2FA challenge below)
      // has passed, and then happens atomically before any session is minted.
      // Consuming it up front burned the link on the 206 two-factor challenge,
      // so the documented retry (same body plus `twoFactorToken`) always found
      // a NULL token and could never complete the login — every attempt spent
      // a fresh reset link for nothing.
      let authenticatedByResetToken = false

      // Try password authentication.
      if (body.password && secrets.passwordHash) {
        authenticated = await compare(body.password, secrets.passwordHash)
      }

      // Try password reset token (constant-time comparison to prevent timing
      // attacks). The stored value is sha256(token) — hash the incoming one.
      // Read-only here: the TTL is checked, but the token is NOT consumed yet.
      if (!authenticated && body.passwordResetToken && secrets.passwordResetToken) {
        const a = Buffer.from(hashResetToken(body.passwordResetToken), 'utf-8')
        const b = Buffer.from(secrets.passwordResetToken, 'utf-8')
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
          // Check if the token is still valid (within 1 hour). The SAME gate
          // as resetPassword: an unparseable or future-dated timestamp is
          // refused here too — this path mints an authenticated session, so
          // it must not be looser than the reset path for the same
          // one-hour credential.
          if (secrets.passwordResetTokenAt) {
            const tokenAge = Date.now() - new Date(secrets.passwordResetTokenAt).getTime()
            if (Number.isFinite(tokenAge) && tokenAge >= 0 && tokenAge < 1000 * 60 * 60) {
              authenticated = true
              authenticatedByResetToken = true
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

          // Persist the consumed time step ATOMICALLY so the same code cannot
          // be replayed on another session/endpoint within its validity window.
          // The UPDATE only matches while the stored step is still OLDER than
          // the one being consumed (or NULL — the first 2FA login), so of two
          // concurrent logins replaying the same code — both read the same
          // stale step, both pass verify() — exactly one wins the row; the
          // loser's guarded write matches nothing and is refused as a replay.
          if (verifyResult.timeStep !== undefined) {
            // `?? null` also maps a runtime NULL (the column is NULL until the
            // first 2FA login; logInOAuth writes it as null on creation) to the
            // is_null branch — SQL `NULL < step` matches no row, so a plain `<`
            // comparison would refuse every FIRST 2FA login.
            const previousStep = secrets.lastTwoFactorTimeStep ?? null
            const stepWhere: WhereCondition[] = [{ field: 'id', operator: '=', value: user.id }]
            if (previousStep === null) {
              stepWhere.push({ field: 'lastTwoFactorTimeStep', operator: 'is_null' })
            } else {
              stepWhere.push({
                field: 'lastTwoFactorTimeStep',
                operator: '<',
                value: verifyResult.timeStep,
              })
            }
            const consumed = await updateMany(`${tableName}Secrets`, stepWhere, {
              lastTwoFactorTimeStep: verifyResult.timeStep,
            })
            if (consumed.affected !== 1) {
              analytics.track({ name: 'user.two_factor_failed', userId: user.id }).catch(() => {})
              return {
                statusCode: 403,
                body: {
                  error: t('user.error.invalidTwoFactorToken'),
                  errorKey: 'user.error.invalidTwoFactorToken',
                },
              }
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

      // Consume the one-time reset token ATOMICALLY, now that every challenge
      // that can still refuse the request has passed: the clear is
      // WHERE-guarded on the very token value that was verified above, so of
      // two concurrent requests holding the same token only the one that
      // flips it to NULL matches a row — the other sees affected 0 and is
      // refused instead of minting a session. (A plain updateById cleared
      // "whatever is there", so both requests passed and both minted
      // sessions.) This must stay AFTER the 2FA gate — a 206 challenge must
      // not burn the link, the retry needs it — and BEFORE any session is
      // minted below.
      if (authenticatedByResetToken) {
        const consumed = await updateMany(
          `${tableName}Secrets`,
          [
            { field: 'id', operator: '=', value: user.id },
            { field: 'passwordResetToken', operator: '=', value: secrets.passwordResetToken },
          ],
          { passwordResetToken: null, passwordResetTokenAt: null },
        )
        if (consumed.affected !== 1) {
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
          // What ACTUALLY authenticated the request: a body carrying both a
          // valid password and a reset token authenticated by the password and
          // did NOT spend the link — calling that a reset_token login makes
          // the event lie about which credential is still live.
          properties: { method: authenticatedByResetToken ? 'reset_token' : 'password' },
        })
        .catch(() => {})

      // `user` is a `SELECT *` row — strip secret columns (email-confirmation /
      // reset tokens, OAuth material, app-added secrets) exactly like a self-read.
      const safeUser = stripSensitiveUserColumns(user as Record<string, unknown>)
      return { statusCode: 200, body: { props: safeUser, accessToken, user: safeUser } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: { error: t('user.error.loginFailed'), errorKey: 'user.error.loginFailed' },
      }
    }
  }
}
