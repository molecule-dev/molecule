import { v4 as uuid } from 'uuid'

import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { create as storeCreate, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { hash } from '@molecule/api-password'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import { create as resourceCreate } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import { createPropsSchema } from '../schema.js'
import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for user creation, including password and optional device name. */
export interface CreateRequest extends MoleculeRequest {
  body: types.CreateProps & {
    password?: string
    deviceName?: string
  }
}

/**
 * Creates a user with username and password. Validates username uniqueness and email format,
 * hashes the password into a separate secrets table, creates a session device via the bonded
 * DeviceService, and sets JWT authorization on the response.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with `{ statusCode: 201, body: { props } }` on success.
 */
export const create = ({ name, tableName, schema: _schema }: types.Resource) => {
  const createResource = resourceCreate({
    name,
    tableName,
    schema: createPropsSchema,
  })

  return async (req: CreateRequest, res: MoleculeResponse) => {
    let body!: { password?: string; deviceName?: string }
    let props!: types.CreateProps

    try {
      const { password, deviceName, ...createProps } = req.body
      body = { password, deviceName }
      props = createProps

      if (props.username) {
        // Limit username to 255 alphanumeric characters.
        props.username = props.username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 255)
      } else {
        return {
          statusCode: 400,
          body: {
            error: t('user.error.usernameRequired'),
            errorKey: 'user.error.usernameRequired',
          },
        }
      }

      if (!body.password) {
        return {
          statusCode: 400,
          body: {
            error: t('user.error.passwordRequired'),
            errorKey: 'user.error.passwordRequired',
          },
        }
      }

      if (props.email) {
        props.email = props.email.substring(0, 1023)
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email)) {
          return {
            statusCode: 400,
            body: { error: t('user.error.emailInvalid'), errorKey: 'user.error.emailInvalid' },
          }
        }
      } else if (props.email === '') {
        props.email = null as unknown as string
      }
    } catch (err) {
      logger.warn('Failed to parse user create request body', { error: err })
      return {
        statusCode: 400,
        body: { error: t('user.error.badRequest'), errorKey: 'user.error.badRequest' },
      }
    }

    try {
      // Check if username is taken.
      const usernameTaken = Boolean(
        (
          await findOne<{ id: string }>(tableName, [
            { field: 'username', operator: '=', value: props.username },
          ])
        )?.id,
      )

      if (usernameTaken) {
        return {
          statusCode: 403,
          body: {
            error: t('user.error.usernameUnavailable'),
            errorKey: 'user.error.usernameUnavailable',
          },
        }
      }

      if (props.email) {
        const emailTaken = Boolean(
          (
            await findOne<{ id: string }>(tableName, [
              { field: 'email', operator: '=', value: props.email },
            ])
          )?.id,
        )

        if (emailTaken) {
          return {
            statusCode: 403,
            body: {
              error: t('user.error.emailAlreadyRegistered'),
              errorKey: 'user.error.emailAlreadyRegistered',
            },
          }
        }
      }
    } catch (error) {
      logger.error(error)
    }

    // Create the id in advance.
    const id = uuid()

    // Hash and store the password.
    try {
      const passwordHash = await hash(body.password!)
      const result = await storeCreate(`${tableName}Secrets`, { id, passwordHash })

      if (!result?.affected) {
        throw new Error(`Failed to insert passwordHash into ${tableName}Secrets.`)
      }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('user.error.failedToHashPassword'),
          errorKey: 'user.error.failedToHashPassword',
        },
      }
    }

    // Create the user.
    const createdResponse = await createResource({ props, id: id as string })

    if (createdResponse && createdResponse.statusCode === 201) {
      try {
        const deviceId = await get<{
          createOrUpdate(userId: string, deviceName: string): Promise<string | null>
        }>('device')?.createOrUpdate(id, body.deviceName || 'Unknown')

        if (deviceId) {
          authorization.set(req, res, { userId: id, deviceId })
          analytics
            .track({ name: 'user.signup', userId: id, properties: { method: 'password' } })
            .catch(() => {})
          analytics
            .identify({
              userId: id,
              email: props.email || undefined,
              name: props.name || undefined,
            })
            .catch(() => {})
        } else {
          throw new Error('Failed to create session device.')
        }
      } catch (error) {
        logger.error(error)
        return {
          statusCode: 500,
          body: {
            error: t('user.error.failedToCreateSession'),
            errorKey: 'user.error.failedToCreateSession',
          },
        }
      }
    }

    return createdResponse
  }
}
