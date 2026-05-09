import { getAnalytics, getLogger } from '@molecule/api-bond'
import { findOne } from '@molecule/api-database'
const logger = getLogger()
const analytics = getAnalytics()
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'
import { update as resourceUpdate } from '@molecule/api-resource'

import { propsSchema, updatePropsSchema } from '../schema.js'
import type * as types from '../types.js'

/**
 * Extended update schema that also permits the application-specific
 * `oauthData` bag to flow through the standard `PATCH /api/users/:id`
 * endpoint. Apps frequently store per-user UI/feature preferences inside
 * `oauthData` (it is the only freeform JSON field on the user row), so
 * the update handler needs to accept and persist it.
 *
 * Username/name/email retain their existing validation paths above.
 */
const extendedUpdatePropsSchema = updatePropsSchema.extend({
  oauthData: propsSchema.shape.oauthData,
})

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
    schema: extendedUpdatePropsSchema,
  })

  return async (req: MoleculeRequest) => {
    try {
      const id = req.params.id as string
      const props: types.UpdateProps & { oauthData?: Record<string, unknown> } = {}

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

      if (req.body.oauthData !== undefined) {
        if (req.body.oauthData === null || typeof req.body.oauthData !== 'object') {
          return {
            statusCode: 400,
            body: {
              error: t('user.error.oauthDataInvalid', undefined, {
                defaultValue: 'oauthData must be an object.',
              }),
              errorKey: 'user.error.oauthDataInvalid',
            },
          }
        }
        props.oauthData = req.body.oauthData as Record<string, unknown>
      }

      if (Object.keys(props).length === 0) {
        return {
          statusCode: 400,
          body: {
            error: t('user.error.noUpdatableFields', undefined, {
              defaultValue: 'No updatable fields were provided.',
            }),
            errorKey: 'user.error.noUpdatableFields',
          },
        }
      }

      const result = await updateResource({ id: id as string, props })
      analytics
        .track({
          name: 'user.profile_updated',
          userId: id,
          properties: { fields: Object.keys(props) },
        })
        .catch(() => {})
      return result
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
