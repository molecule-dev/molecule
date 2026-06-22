import crypto from 'node:crypto'

import { v4 as uuid } from 'uuid'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import { create as storeCreate, findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import { create as resourceCreate } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import type * as types from '../types.js'
import { normalizeEmail } from '../utilities/normalizeEmail.js'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Constant-time comparison of two strings. Returns `false` on length mismatch
 * (lengths are not secret here) and otherwise uses `crypto.timingSafeEqual`, so
 * the OAuth state ↔ cookie check does not leak via comparison timing.
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` if the strings are equal.
 */
const timingSafeEqualString = (a: string, b: string): boolean => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    return false
  }
  return crypto.timingSafeEqual(ab, bb)
}

/** Request body for OAuth login, including the OAuth server name, authorization code, and PKCE verifier. */
export interface LogInOAuthRequest extends MoleculeRequest {
  body: {
    server?: string
    code?: string
    state?: string
    codeVerifier?: string
    redirect_uri?: string
    deviceName?: string
  }
}

/**
 * Logs in or creates a user via OAuth. Verifies the authorization code with the bonded OAuth
 * provider (`get('oauth', serverName)`), then either finds an existing user by oauthServer+oauthId
 * or creates a new one with a unique username. Sets JWT authorization and creates a session device.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 200, body: { props } }` on success.
 */
export const logInOAuth = ({ name, tableName, schema }: types.Resource) => {
  const createResource = resourceCreate({
    name,
    tableName,
    schema,
  })

  return async (req: LogInOAuthRequest, res: MoleculeResponse) => {
    const { body } = req

    if (!body.server || !body.code) {
      return {
        statusCode: 400,
        body: { error: t('user.error.badRequest'), errorKey: 'user.error.badRequest' },
      }
    }

    // Validate the OAuth CSRF state parameter. This is MANDATORY, not gated on
    // whether the (attacker-controlled) request happened to send a `state` —
    // otherwise a forged cross-site callback that simply omits `state` would
    // skip the check entirely (login-CSRF / session fixation: the attacker
    // plants their own session in the victim's browser). The `oauth_state`
    // cookie is set by GET /users/oauth/:provider; callback `state` must equal
    // it. Deployments that genuinely don't wire the state-cookie endpoint can
    // opt out with OAUTH_REQUIRE_STATE=false, but the secure behavior ships ON
    // by default and is NEVER relaxed based on request presence.
    const requireState = getConfig<string>('OAUTH_REQUIRE_STATE', 'true') !== 'false'
    if (requireState) {
      // In production the state cookie is `__Host-`-prefixed (unshadowable by a
      // sibling subdomain). [C4-1] We must NOT accept the plain name in production:
      // a tenant on a sibling `*.molecule.dev` preview can toss a `.molecule.dev`
      // plain `oauth_state` cookie, and a plain-name fallback would let that tossed
      // value satisfy the CSRF check (login-CSRF / session fixation). `__Host-`
      // cookies cannot carry a Domain, so they can't be tossed. oauth_state has a
      // 5-min TTL, so there is no legacy plain cookie to support — drop the fallback
      // in production. In dev (no `__Host-`) the plain name is the real cookie.
      const stateCookies = (req as unknown as { cookies?: Record<string, string> }).cookies
      const cookieState =
        getConfig<string>('NODE_ENV') === 'production'
          ? stateCookies?.[authorization.getAuthCookieName('oauth_state')]
          : (stateCookies?.[authorization.getAuthCookieName('oauth_state')] ??
            stateCookies?.oauth_state)
      const expressRes = res as unknown as {
        clearCookie?(name: string, options?: Record<string, unknown>): void
      }
      // The state cookie is one-time use — always clear it, match or not. Clear
      // BOTH names so a leftover plain/prefixed copy can't linger. A `__Host-`
      // cookie must be cleared with Secure + Path=/ to match how it was set.
      const clearStateCookie = (): void => {
        if (typeof expressRes.clearCookie === 'function') {
          expressRes.clearCookie(authorization.getAuthCookieName('oauth_state'), {
            path: '/',
            secure: getConfig('NODE_ENV') === 'production',
          })
          expressRes.clearCookie('oauth_state', { path: '/' })
        }
      }
      if (!body.state || !cookieState || !timingSafeEqualString(cookieState, body.state)) {
        clearStateCookie()
        return {
          statusCode: 403,
          body: {
            error: t('user.error.oauthStateMismatch', undefined, {
              defaultValue: 'OAuth state mismatch — possible CSRF attack',
            }),
            errorKey: 'user.error.oauthStateMismatch',
          },
        }
      }
      clearStateCookie()
    }

    // [M1-1] Read the PKCE code_verifier from the httpOnly cookie set by the OAuth
    // initiation endpoint — SERVER-SIDE, never trusting a client-supplied body value.
    // The verifier is the per-session secret that binds the authorization code to THIS
    // session (S256). Trusting `body.codeVerifier` would let an attacker replay a
    // victim's intercepted code with their own verifier (authorization-code injection,
    // RFC 9700 §2.1). One-time use: cleared whether or not verification succeeds. The
    // body fallback is only for legacy consumers that never set the cookie — the random
    // S256 challenge issued at initiation is the actual injection guard either way.
    const verifierCookies = (req as unknown as { cookies?: Record<string, string> }).cookies
    const cookieVerifier =
      getConfig<string>('NODE_ENV') === 'production'
        ? verifierCookies?.[authorization.getAuthCookieName('oauth_verifier')]
        : (verifierCookies?.[authorization.getAuthCookieName('oauth_verifier')] ??
          verifierCookies?.oauth_verifier)
    const expressResVerifier = res as unknown as {
      clearCookie?(name: string, options?: Record<string, unknown>): void
    }
    if (typeof expressResVerifier.clearCookie === 'function') {
      expressResVerifier.clearCookie(authorization.getAuthCookieName('oauth_verifier'), {
        path: '/',
        secure: getConfig('NODE_ENV') === 'production',
      })
      expressResVerifier.clearCookie('oauth_verifier', { path: '/' })
    }
    const codeVerifier = cookieVerifier ?? body.codeVerifier

    const oauthProvider = get<{
      verify(
        code: string,
        codeVerifier?: string,
        redirectUri?: string,
      ): Promise<{
        username?: string
        name?: string
        email?: string
        /**
         * Whether the provider affirmatively verified the user controls this
         * email mailbox. Only an explicit `true` is trusted — see
         * `@molecule/api-oauth`'s `OAuthUserProps.emailVerified`.
         */
        emailVerified?: boolean
        oauthServer: string
        oauthId: string
        oauthData: unknown
      } | null>
    }>('oauth', body.server)
    if (!oauthProvider) {
      return {
        statusCode: 400,
        body: {
          error: t('user.error.oauthServerNotConfigured', { server: body.server! }),
          errorKey: 'user.error.oauthServerNotConfigured',
        },
      }
    }

    try {
      // Verify the OAuth code with the bonded provider.
      const oauthProps = await oauthProvider.verify(body.code, codeVerifier, body.redirect_uri)

      if (!oauthProps?.oauthId || !oauthProps?.oauthServer) {
        analytics
          .track({
            name: 'user.login_failed',
            properties: { reason: 'oauth_verification_failed', provider: body.server },
          })
          .catch(() => {})
        return {
          statusCode: 403,
          body: {
            error: t('user.error.oauthVerificationFailed'),
            errorKey: 'user.error.oauthVerificationFailed',
          },
        }
      }

      // Normalize the provider email once so storage and every collision
      // lookup compare the same canonical form — a case/whitespace variant
      // (`Foo@x.com` vs `foo@x.com`) must not slip past the UNIQUE column.
      const email = normalizeEmail(oauthProps.email)
      // Only an explicit provider-verified flag counts as proof of mailbox
      // ownership. Undefined/false from a provider that can't confirm is
      // treated as unverified.
      const oauthEmailVerified = oauthProps.emailVerified === true

      // Check if a user already exists with this OAuth ID.
      let user = await findOne<types.Props>(tableName, [
        { field: 'oauthServer', operator: '=', value: oauthProps.oauthServer },
        { field: 'oauthId', operator: '=', value: oauthProps.oauthId },
      ])

      if (!user) {
        // Account-takeover + UNIQUE-crash guard. An OAuth login whose email
        // already belongs to ANOTHER account must never silently create a
        // second user (the `email` column is UNIQUE, so that throws and
        // surfaces as an opaque 500). What we do on collision depends on who
        // can prove they own the mailbox:
        //
        //  • OAuth email is provider-VERIFIED and the existing account is
        //    UNVERIFIED → the OAuth user is the proven owner and the existing
        //    account never proved ownership (classic squatting: an unverified
        //    local signup at someone else's address). Link this provider into
        //    the existing account so the verified owner isn't locked out.
        //  • Otherwise (OAuth email unverified, OR the existing account is
        //    already verified) → do NOT auto-link; an unverified provider email
        //    could be typo-squatted/compromised, and we never wrest a verified
        //    account away. Reject with an actionable 409.
        if (email) {
          const existingByEmail = await findOne<types.Props>(tableName, [
            { field: 'email', operator: '=', value: email },
          ])
          if (existingByEmail) {
            const existingVerified = existingByEmail.emailVerified === true

            if (oauthEmailVerified && !existingVerified) {
              // Trust the provider-verified owner: link this OAuth identity
              // into the existing (unverified) account and mark it verified.
              // Also reset twoFactorEnabled — the squatter's prior 2FA state must
              // not carry over onto an account a different verified human now owns.
              await updateById(tableName, existingByEmail.id, {
                oauthServer: oauthProps.oauthServer,
                oauthId: oauthProps.oauthId,
                oauthData: JSON.stringify(oauthProps.oauthData),
                emailVerified: true,
                email,
                twoFactorEnabled: false,
                updatedAt: new Date().toISOString(),
              })

              // PRE-ACCOUNT-HIJACKING DEFENSE. The pre-existing unverified row
              // could be a squatter who registered the victim's email with a
              // password (and 2FA) THEY control — and may already hold a live
              // session. Now that a provider-verified human owns this email,
              // every prior credential on the row is untrusted: wipe the
              // password / reset-token / 2FA secrets so the squatter's password
              // can no longer authenticate via POST /users/log-in, and revoke
              // all existing devices/sessions so any session the squatter
              // already holds is killed. A fresh session for the verified owner
              // is issued below (device.createOrUpdate → authorization.set).
              await updateById(`${tableName}Secrets`, existingByEmail.id, {
                passwordHash: null,
                passwordResetToken: null,
                passwordResetTokenAt: null,
                pendingTwoFactorSecret: null,
                twoFactorSecret: null,
                lastTwoFactorTimeStep: null,
              })

              try {
                await get<{ deleteByUserId(userId: string): Promise<void> }>(
                  'device',
                )?.deleteByUserId(existingByEmail.id)
                // Evict this process's positive device-exists cache so any live
                // session the squatter holds is rejected on its next request,
                // not after the cache TTL — immediate in-process revocation.
                authorization.invalidateAllDeviceExistsCache()
              } catch (err) {
                logger.warn('Failed to revoke prior sessions while claiming squatted account', {
                  userId: existingByEmail.id,
                  error: err,
                })
              }

              analytics
                .track({
                  name: 'user.oauth_linked',
                  userId: existingByEmail.id,
                  properties: {
                    provider: oauthProps.oauthServer,
                    reason: 'verified_email_claimed_unverified_account',
                  },
                })
                .catch((err) => {
                  logger.debug('Failed to track user.oauth_linked', { error: err })
                })

              // Re-read the merged row so the response + session reflect DB truth.
              user = (await findById<types.Props>(tableName, existingByEmail.id)) ?? existingByEmail
            } else {
              analytics
                .track({
                  name: 'user.login_failed',
                  properties: {
                    reason: 'oauth_email_collision',
                    provider: oauthProps.oauthServer,
                  },
                })
                .catch((err) => {
                  logger.debug('Failed to track user.login_failed', { error: err })
                })
              return {
                statusCode: 409,
                body: {
                  error: t('user.error.emailAlreadyRegistered', undefined, {
                    defaultValue:
                      'An account already exists for this email. Please sign in with your original method, then link this provider from your account settings.',
                  }),
                  errorKey: 'user.error.emailAlreadyRegistered',
                },
              }
            }
          }
        }
      }

      if (!user) {
        // Create a new user.
        const id = uuid()

        // Generate a unique username from OAuth data.
        let username = oauthProps.username || oauthProps.oauthId
        username = username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 255)

        // Ensure username is unique.
        const existing = await findOne<{ id: string }>(tableName, [
          { field: 'username', operator: '=', value: username },
        ])

        if (existing) {
          username = `${username}${id.substring(0, 8)}`
        }

        const createResponse = await createResource({
          props: {
            username,
            name: oauthProps.name,
            email: email || null,
            emailVerified: oauthEmailVerified,
            oauthServer: oauthProps.oauthServer,
            oauthId: oauthProps.oauthId,
            oauthData: oauthProps.oauthData,
          },
          id,
        })

        if (createResponse?.statusCode === 201) {
          user = createResponse.body?.props as unknown as types.Props
        }

        if (!user) {
          // The insert failed. The most likely non-bug cause is a TOCTOU race:
          // a concurrent request created an account with this same email
          // between our pre-check and this insert, so the UNIQUE constraint
          // rejected it. Detect that DB-agnostically (no provider-specific
          // error codes) by re-checking the email, and surface a clean 409
          // instead of an opaque 500.
          if (email) {
            const racedByEmail = await findOne<{ id: string }>(tableName, [
              { field: 'email', operator: '=', value: email },
            ])
            if (racedByEmail) {
              analytics
                .track({
                  name: 'user.login_failed',
                  properties: {
                    reason: 'oauth_email_collision_race',
                    provider: oauthProps.oauthServer,
                  },
                })
                .catch((err) => {
                  logger.debug('Failed to track user.login_failed', { error: err })
                })
              return {
                statusCode: 409,
                body: {
                  error: t('user.error.emailAlreadyRegistered', undefined, {
                    defaultValue:
                      'An account already exists for this email. Please sign in with your original method, then link this provider from your account settings.',
                  }),
                  errorKey: 'user.error.emailAlreadyRegistered',
                },
              }
            }
          }

          return {
            statusCode: 500,
            body: {
              error: t('user.error.failedToCreateUser'),
              errorKey: 'user.error.failedToCreateUser',
            },
          }
        }

        // Create secrets row (no password for OAuth users).
        await storeCreate(`${tableName}Secrets`, { id }).catch((err) => {
          logger.warn('Failed to store OAuth secrets', { userId: id, error: err })
        })

        analytics
          .track({
            name: 'user.signup',
            userId: user.id,
            properties: { method: 'oauth', provider: oauthProps.oauthServer },
          })
          .catch(() => {})
        analytics
          .identify({
            userId: user.id,
            email: oauthProps.email || undefined,
            name: oauthProps.name || undefined,
          })
          .catch(() => {})
      } else {
        // Update OAuth data on existing user.
        await updateById(tableName, user.id, {
          oauthData: JSON.stringify(oauthProps.oauthData),
          updatedAt: new Date().toISOString(),
        }).catch((err) => {
          logger.warn('Failed to update OAuth data', { userId: user!.id, error: err })
        })

        analytics
          .track({
            name: 'user.login',
            userId: user.id,
            properties: { method: 'oauth', provider: oauthProps.oauthServer },
          })
          .catch(() => {})
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
      authorization.set(req, res, {
        userId: user.id,
        deviceId,
        oauthServer: oauthProps.oauthServer,
        oauthId: oauthProps.oauthId,
      })

      return { statusCode: 200, body: { props: user } }
    } catch (error) {
      // Never log the raw error here: an OAuth verify failure rethrows an
      // error whose attached request/response could carry the token-exchange
      // body (client_secret, code) or an Authorization header. Log only the
      // message (CWE-532).
      logger.error('OAuth login failed:', error instanceof Error ? error.message : String(error))
      return {
        statusCode: 500,
        body: { error: t('user.error.oauthLoginFailed'), errorKey: 'user.error.oauthLoginFailed' },
      }
    }
  }
}
