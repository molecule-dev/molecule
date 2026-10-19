import crypto from 'node:crypto'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { findById, findOne, updateMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { compare, hash } from '@molecule/api-password'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import type { DeviceService } from '@molecule/api-resource-device'

import * as authorization from '../authorization.js'
import type * as types from '../types.js'
import { hashResetToken } from '../utilities/hashResetToken.js'
import { normalizeEmail } from '../utilities/normalizeEmail.js'
import { notify } from '../utilities/notify.js'
import { stripSensitiveUserColumns } from '../utilities/stripSensitiveUserColumns.js'
import { RESET_TOKEN_TTL_MS } from './resetPassword.js'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Cached, real bcrypt hash used for the dummy compare on every
 * invalid-credentials path that would otherwise run no KDF (see
 * {@link compareDummyHash}).
 *
 * Computed lazily (not at import time) via the password bond — which honors the
 * configured cost (`SALT_ROUNDS`) — because the bond may not be wired when this
 * module loads. A previous implementation used a hardcoded literal that was
 * structurally malformed (54 chars after the cost prefix instead of 53), so
 * `compare()` short-circuited to `false` in ~0ms WITHOUT running the KDF,
 * defeating the timing-equalization defense and reintroducing a user-enumeration
 * oracle. Deriving the dummy hash from the bond's `hash()` guarantees it is
 * valid and matches the exact work factor of real password hashes.
 *
 * The PROMISE is what is cached, not the resolved value: an invalid-login burst
 * is caller-controlled, and `hash()` is awaited for the whole cost of a KDF, so
 * caching only after it resolves meant every concurrent refusal arriving while
 * the cache was cold ran its OWN full-cost hash — N bcrypt runs where the cache
 * exists to make it one in total. A FAILED hash is never left cached (a
 * rejected promise would make every later refusal reuse it and skip the
 * compare entirely, which is the timing oracle this whole path exists to close).
 */
let dummyHashPromise: Promise<string> | undefined

/**
 * Runs one bcrypt compare against the cached dummy hash, for every request that
 * supplies a password but reaches an invalid-credentials answer WITHOUT having
 * run a real compare — the user-not-found path, the found path whose secrets
 * row is missing, and the found path for an account that carries no password
 * hash (an OAuth-only account). Without these, the ~100-300ms KDF runs for
 * "wrong password" but not for the refusals next to it, so response timing on a
 * known email discloses exactly which accounts exist and which are passwordless
 * — an account-existence oracle aimed at the users with no password attack
 * surface.
 *
 * @param password - The password the caller supplied.
 */
async function compareDummyHash(password: string): Promise<void> {
  try {
    dummyHashPromise ??= hash('molecule-dummy-password')
    await compare(password, await dummyHashPromise)
  } catch (_error) {
    // Best-effort timing equalizer only: a hashing/compare failure must not
    // alter the response or surface an error — every caller answers the same
    // generic invalid-credentials result below either way. Drop the cached
    // promise too, so a hash that FAILED is retried by the next refusal
    // instead of being reused (a rejected promise here would skip the compare
    // for every later request, reopening the oracle this path closes).
    dummyHashPromise = undefined
  }
}

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
 *
 * `schema` is optional and NOT used here: login reads stored rows and compares credentials, so
 * there are no props to validate. Statuses: 200 `{ props, accessToken, user }`; 206
 * `{ twoFactorRequired: true }` when the account has 2FA enabled and no `twoFactorToken` was
 * sent; 403 `user.error.invalidCredentials` (wrong password / unknown account / spent reset
 * token) or `user.error.invalidTwoFactorToken`; 500 `user.error.failedToCreateSession` /
 * `user.error.twoFactorVerificationUnavailable` / `user.error.loginFailed`.
 * @param resource - The user resource configuration: `{ name, tableName, schema? }`.
 * @param resource.name - The resource name (unused by this handler).
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - Optional. Ignored — login validates credentials, not props.
 * @returns A request handler that responds with `{ statusCode: 200, body: { props, accessToken, user } }`
 *   on success, or `{ statusCode: 206, body: { twoFactorRequired: true } }` when 2FA is needed.
 */
export const logIn = ({ tableName }: types.HandlerResource) => {
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
        if (body.password) await compareDummyHash(body.password)
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
        // A user row whose secrets row is missing (logInOAuth logs-and-continues
        // when the secrets insert fails) reached this refusal WITHOUT running any
        // KDF, while "no such user" and "wrong password" each ran one — response
        // timing on a known email then separated "this account exists" from both,
        // the same oracle the other invalid-credentials paths fill (see
        // {@link compareDummyHash}). The failure is tracked like them too: a
        // probe against this account was refused either way.
        if (body.password) await compareDummyHash(body.password)
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

      let authenticated = false
      // Whether a REAL bcrypt compare already ran for this request (a stored
      // password hash existed and was compared against): the dummy compare in
      // the refusal path below must fill only the paths where no KDF ran, not
      // stack a second one on top of a real compare.
      let ranPasswordCompare = false
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
        ranPasswordCompare = true
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
          // as resetPassword — the same constant and the same boundary
          // (`tokenAge` equal to the TTL is still valid, exactly as the reset
          // confirmation treats it): an unparseable or future-dated timestamp
          // is refused here too — this path mints an authenticated session,
          // so it must not be looser than the reset path for the same
          // one-hour credential.
          if (secrets.passwordResetTokenAt) {
            const tokenAge = Date.now() - new Date(secrets.passwordResetTokenAt).getTime()
            if (Number.isFinite(tokenAge) && tokenAge >= 0 && tokenAge <= RESET_TOKEN_TTL_MS) {
              authenticated = true
              authenticatedByResetToken = true
            }
          }
        }
      }

      if (!authenticated) {
        // An account that exists but carries no password hash (an OAuth-only
        // account) reached this refusal WITHOUT running any KDF, while "wrong
        // password" and "no such user" each ran one — so response timing on a
        // known email disclosed exactly which accounts are passwordless. Fill
        // every no-KDF invalid-credentials path with the dummy compare (see
        // {@link compareDummyHash}); never stack it on a real compare.
        if (body.password && !ranPasswordCompare) await compareDummyHash(body.password)
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
      //
      // Gated on `twoFactorEnabled` ALONE, then refused when the secret is
      // missing — never `&& secrets.twoFactorSecret`. That `&&` made the state
      // "2FA enabled, no secret stored" (a disable whose secret clear landed
      // before its `twoFactorEnabled: false` write, a half-applied enable, or a
      // repaired row) log the caller in on the password alone, silently
      // dropping the very challenge the account turned on. `logInOAuth` refuses
      // the same state outright ("an OAuth login must NOT issue a session on
      // its own"), so this path must not be the looser way in for it.
      if (user.twoFactorEnabled) {
        if (!secrets.twoFactorSecret) {
          logger.error(
            '2FA is enabled for this account but no secret is stored; refusing the login rather than dropping the challenge',
            { userId: user.id },
          )
          return {
            statusCode: 500,
            body: {
              error: t('user.error.twoFactorVerificationUnavailable'),
              errorKey: 'user.error.twoFactorVerificationUnavailable',
            },
          }
        }
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
      // `get<DeviceService>('device')` is the typed accessor — never a hand-typed
      // `get<{ createOrUpdate(): … }>` generic (a wrong one compiles and returns
      // `undefined` for a field you invented, which mints a token no request accepts).
      // `createOrUpdate` resolves to the device id STRING, or null on failure.
      const deviceId = await get<DeviceService>('device')?.createOrUpdate(
        user.id,
        body.deviceName || 'Unknown',
      )

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
