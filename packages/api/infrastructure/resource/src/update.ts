/**
 * Resource update operation.
 *
 * @module
 */

import type { ZodSchema } from 'zod'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import type * as types from './types.js'
import { getValidProps } from './utilities/index.js'

/**
 * Creates a handler to update a resource by its `id` and some `props`.
 *
 * Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.
 *
 * Example usage:
 * ```ts
 * import { update as resourceUpdate } from '`@molecule/api-resource`'
 * import type * as types from '../../types.js'
 *
 * export const update = ({ name, tableName, schema }: types.Resource) => {
 *   const update = resourceUpdate({ name, tableName, schema })
 *
 *   return async (req: MoleculeRequest) => {
 *     const id = req.params.id
 *     const props = req.body
 *     return await update({ id, props })
 *   }
 * }
 * ```
 * @param resource - The resource descriptor.
 * @param resource.name - Human-readable resource name used in error messages (e.g. `'User'`).
 * @param resource.tableName - Database table to update the row in.
 * @param resource.schema - Zod schema to validate the incoming props against.
 * @returns A curried async function that accepts `{ id, props }` and returns a `{ statusCode, body }` response.
 */
export const update =
  <
    UpdateProps extends Record<string, unknown> = Record<string, unknown>,
    UpdatedProps extends Pick<types.Props, `updatedAt`> & UpdateProps = Pick<
      types.Props,
      `updatedAt`
    > &
      UpdateProps,
  >({
    name,
    tableName,
    schema,
  }: types.Resource) =>
  async ({
    id,
    props: updateProps,
  }: {
    /**
     * The `id` of the resource to be updated.
     */
    id: UpdatedProps['id'] | types.Props['id']
    /**
     * The properties to be updated.
     *
     * Usually from `req.body`.
     */
    props: UpdateProps
  }) => {
    // TypeScript 5+ requires explicit unknown cast for generic type conversions
    let props = updateProps as unknown as UpdatedProps

    try {
      // Describe when the resource was updated.
      props.updatedAt = new Date().toISOString()

      // Validate the new `props`.
      props = getValidProps<UpdatedProps>({
        name,
        schema: schema as unknown as ZodSchema<UpdatedProps>,
        props,
      })
    } catch (error) {
      // The provided `props` failed validation.
      return {
        statusCode: 400,
        body: {
          error: error
            ? String(error)
            : t('resource.error.unknownError', undefined, { defaultValue: 'Unknown error.' }),
          errorKey: 'resource.error.unknownError',
        },
      }
    }

    try {
      // Update the resource in the database via the bonded DataStore.
      const result = await updateById(
        tableName,
        id as string,
        props as unknown as Record<string, unknown>,
      )

      if (!result.affected) {
        throw new Error(`Unable to update ${tableName} by id: ${id}`)
      }

      // If we made it here, updates to the database were successful.
      return { statusCode: 200, body: { props } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: (error as { statusCode?: number }).statusCode || 400,
        body: {
          error: t(
            'resource.error.unableToUpdate',
            { name },
            { defaultValue: `Unable to update ${name}.` },
          ),
          errorKey: 'resource.error.unableToUpdate',
        },
      }
    }
  }
