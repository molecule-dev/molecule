import { getLogger } from '@molecule/api-bond'
import { findOne } from '@molecule/api-database'
const logger = getLogger()
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'
import { update as resourceUpdate } from '@molecule/api-resource'

import { updatePropsSchema } from '../schema.js'
import type * as types from '../types.js'

/**
 * Updates a user's profile fields (username, name, email). Validates username format
 * (alphanumeric, max 255 chars), email format, and uniqueness of both fields against
 * other users before delegating to the resource update utility.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler that responds with the updated user props on success.
 */
export const update = ({ name, tableName, schema: _schema }: types.Resource) => {
  const updateResource = resourceUpdate({
    name,
    tableName,
    schema: updatePropsSchema,
  })

  return async (req: MoleculeRequest) => {
    try {
      const id = req.params.id as string
      const props: types.UpdateProps = {}

      if (req.body.username !== undefined) {
        props.username = String(req.body.username)
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 255)

        if (!props.username) {
          return {
            statusCode: 400,
            body: {
              error: t('user.error.usernameCannotBeEmpty'),
              errorKey: 'user.error.usernameCannotBeEmpty',
            },
          }
        }

        // Check if username is taken by another user.
        const existing = await findOne<{ id: string }>(tableName, [
          { field: 'username', operator: '=', value: props.username },
          { field: 'id', operator: '!=', value: id },
        ])

        if (existing) {
          return {
            statusCode: 403,
            body: {
              error: t('user.error.usernameUnavailable'),
              errorKey: 'user.error.usernameUnavailable',
            },
          }
        }
      }

      if (req.body.name !== undefined) {
        props.name = String(req.body.name).substring(0, 255)
      }

      if (req.body.email !== undefined) {
        if (req.body.email === '' || req.body.email === null) {
          props.email = null as unknown as string
        } else {
          props.email = String(req.body.email).substring(0, 1023)
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email)) {
            return {
              statusCode: 400,
              body: { error: t('user.error.emailInvalid'), errorKey: 'user.error.emailInvalid' },
            }
          }

          // Check if email is taken by another user.
          const existing = await findOne<{ id: string }>(tableName, [
            { field: 'email', operator: '=', value: props.email },
            { field: 'id', operator: '!=', value: id },
          ])

          if (existing) {
            return {
              statusCode: 403,
              body: {
                error: t('user.error.emailAlreadyRegistered'),
                errorKey: 'user.error.emailAlreadyRegistered',
              },
            }
          }
        }
      }

      return await updateResource({ id: id as string, props })
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('user.error.failedToUpdateUser'),
          errorKey: 'user.error.failedToUpdateUser',
        },
      }
    }
  }
}
