import { getAnalytics, getLogger } from '@molecule/api-bond'
import { findOne } from '@molecule/api-database'
const logger = getLogger()
const analytics = getAnalytics()
import { t } from '@molecule/api-i18n'
import type { MoleculeRequest } from '@molecule/api-resource'
import { update as resourceUpdate } from '@molecule/api-resource'

import { MAX_AVATAR_LENGTH, MAX_BIO_LENGTH, propsSchema, updatePropsSchema } from '../schema.js'
import type * as types from '../types.js'
import { normalizeEmail } from '../utilities/normalizeEmail.js'

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
  // emailVerified is permitted through the schema ONLY so the handler can RESET it
  // to false when the email changes (server-set below). It is NEVER copied from
  // req.body — the same discipline as twoFactorEnabled — so a caller cannot
  // self-verify by sending `emailVerified: true`.
  emailVerified: propsSchema.shape.emailVerified,
  // [M6-1] twoFactorEnabled is deliberately NOT writable here. The generic profile update is
  // gated only by authSelf (no TOTP step-up), so allowing it would let a caller PATCH 2FA off
  // without the current second factor — defeating verifyTwoFactor's disable step-up. ALL 2FA
  // state transitions must go through verifyTwoFactor (enable/disable), which verifies the
  // live TOTP token and updates the secret atomically.
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
      const props: types.UpdateProps & {
        oauthData?: Record<string, unknown>
        emailVerified?: boolean
        twoFactorEnabled?: boolean
      } = {}

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
          // No address on file → it cannot be verified.
          props.emailVerified = false
        } else {
          // Normalize (lowercase) on store to match signup + the login/reset
          // lookups — otherwise a profile email change stores a mixed-case value
          // that those normalized lookups can't find, and lets a case-variant
          // duplicate slip past the uniqueness check below.
          props.email = (normalizeEmail(String(req.body.email)) ?? '').substring(0, 1023)
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

          // Changing the address invalidates the verified flag — the new email is
          // unproven, and leaving emailVerified=true would let a caller point a
          // "verified" email anywhere (poisoning password-reset and email-gated
          // access). Reset ONLY on a real change so an unchanged profile save does
          // not needlessly un-verify. Server-set — never read from req.body.
          const current = await findOne<{ email?: string | null }>(tableName, [
            { field: 'id', operator: '=', value: id },
          ])
          if (!current || current.email !== props.email) {
            props.emailVerified = false
          }
        }
      }

      if (req.body.avatar !== undefined) {
        // `null` or '' clears the avatar; anything else is coerced to a string and length-capped.
        if (req.body.avatar === null || req.body.avatar === '') {
          props.avatar = null
        } else {
          const avatar = String(req.body.avatar)
          if (avatar.length > MAX_AVATAR_LENGTH) {
            return {
              statusCode: 400,
              body: {
                error: t(
                  'user.error.avatarTooLarge',
                  { max: MAX_AVATAR_LENGTH },
                  {
                    defaultValue: 'Avatar must be {{max}} characters or fewer.',
                  },
                ),
                errorKey: 'user.error.avatarTooLarge',
              },
            }
          }
          props.avatar = avatar
        }
      }

      if (req.body.bio !== undefined) {
        // `null` clears the bio; otherwise coerce to a string and length-cap (empty string is allowed).
        if (req.body.bio === null) {
          props.bio = null
        } else {
          const bio = String(req.body.bio)
          if (bio.length > MAX_BIO_LENGTH) {
            return {
              statusCode: 400,
              body: {
                error: t(
                  'user.error.bioTooLong',
                  { max: MAX_BIO_LENGTH },
                  {
                    defaultValue: 'Bio must be {{max}} characters or fewer.',
                  },
                ),
                errorKey: 'user.error.bioTooLong',
              },
            }
          }
          props.bio = bio
        }
      }

      // [M6-1] twoFactorEnabled is intentionally NOT copied from the request body — see the
      // extendedUpdatePropsSchema note above. 2FA toggles go through verifyTwoFactor only.

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
