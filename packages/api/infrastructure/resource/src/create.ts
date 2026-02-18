/**
 * Resource create operation.
 *
 * @module
 */

import { v4 as uuid } from 'uuid'
import type { ZodSchema } from 'zod'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { create as storeCreate } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import type * as types from './types.js'
import { getValidProps } from './utilities/index.js'

/**
 * Creates a handler to create a resource.
 *
 * Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.
 *
 * Example usage:
 * ```ts
 * import { create as resourceCreate } from '`@molecule/api-resource`'
 * import type * as types from '../../types.js'
 *
 * export const create = ({ name, tableName, schema }: types.Resource) => {
 *   const create = resourceCreate({ name, tableName, schema })
 *
 *   return async (req: MoleculeRequest) => {
 *     const props = req.body
 *     return await create({ props })
 *   }
 * }
 * ```
 * @param resource - The resource descriptor.
 * @param resource.name - Human-readable resource name used in error messages (e.g. `'User'`).
 * @param resource.tableName - Database table to insert the new row into.
 * @param resource.schema - Zod schema to validate the incoming props against.
 * @returns A curried async function that accepts `{ props, id? }` and returns a `{ statusCode, body }` response.
 */
export const create =
  <
    CreateProps extends Record<string, unknown> = Record<string, unknown>,
    CreatedProps extends types.Props & CreateProps = types.Props & CreateProps,
  >({
    name,
    tableName,
    schema,
  }: types.Resource) =>
  async ({
    props: createProps,
    id,
  }: {
    /**
     * The properties of the resource to be created.
     *
     * Usually from `req.body`.
     */
    props: CreateProps
    /**
     * Defaults a new UUID when not provided.
     */
    id?: CreatedProps['id']
  }) => {
    // TypeScript 5+ requires explicit unknown cast for generic type conversions
    let props = createProps as unknown as CreatedProps

    try {
      // Assign an `id` to this types.
      id = id || uuid()
      props.id = id

      // Describe when the resource was created/updated.
      props.createdAt = props.createdAt || new Date().toISOString()
      props.updatedAt = props.updatedAt || props.createdAt

      // Validate the new resource's `props`.
      props = getValidProps<CreatedProps>({
        name,
        schema: schema as unknown as ZodSchema<CreatedProps>,
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
      // Insert the new resource into the database via the bonded DataStore.
      const result = await storeCreate(tableName, props as unknown as Record<string, unknown>)

      if (!result.affected) {
        throw new Error(`Failed to insert data into ${tableName}.`)
      }

      // If we made it here, the data was successfully inserted into the database.
      return { statusCode: 201, body: { props } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: (error as { statusCode?: number }).statusCode || 400,
        body: {
          error: t(
            'resource.error.unableToCreate',
            { name },
            { defaultValue: `Unable to create ${name}.` },
          ),
          errorKey: 'resource.error.unableToCreate',
        },
      }
    }
  }
