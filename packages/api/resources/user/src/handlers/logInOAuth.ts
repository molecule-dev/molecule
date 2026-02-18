import { v4 as uuid } from 'uuid'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { create as storeCreate, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import { create as resourceCreate } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for OAuth login, including the OAuth server name, authorization code, and PKCE verifier. */
export interface LogInOAuthRequest extends MoleculeRequest {
  body: {
    server?: string
    code?: string
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

    const oauthProvider = get<{
      verify(
        code: string,
        codeVerifier?: string,
        redirectUri?: string,
      ): Promise<{
        username?: string
        name?: string
        email?: string
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
      const oauthProps = await oauthProvider.verify(body.code, body.codeVerifier, body.redirect_uri)

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

      // Check if a user already exists with this OAuth ID.
      let user = await findOne<types.Props>(tableName, [
        { field: 'oauthServer', operator: '=', value: oauthProps.oauthServer },
        { field: 'oauthId', operator: '=', value: oauthProps.oauthId },
      ])

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
            email: oauthProps.email || null,
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
      logger.error(error)
      return {
        statusCode: 500,
        body: { error: t('user.error.oauthLoginFailed'), errorKey: 'user.error.oauthLoginFailed' },
      }
    }
  }
}
