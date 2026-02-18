/**
 * Resource read operation.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import type * as types from './types.js'

/**
 * Creates a handler to read a resource by its `id`.
 *
 * Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.
 *
 * Example usage:
 * ```ts
 * import { read as resourceRead } from '`@molecule/api-resource`'
 * import type * as types from '../../types.js'
 *
 * export const read = ({ name, tableName, schema }: types.Resource) => {
 *   const read = resourceRead({ name, tableName, schema })
 *
 *   return async (req: MoleculeRequest) => {
 *     const id = req.params.id
 *     return await read({ id })
 *   }
 * }
 * ```
 * @param resource - The resource descriptor.
 * @param resource.tableName - Database table to query the resource from.
 * @returns A curried async function that accepts `{ id, props? }` and returns a `{ statusCode, body }` response.
 */
export const read =
  <
    ReadProps extends types.Props = types.Props,
    ReadResource extends types.Resource<ReadProps> = types.Resource<ReadProps>,
  >({
    tableName,
  }: ReadResource) =>
  async ({
    id,
    props,
  }: {
    /**
     * The `id` of the resource to be retrieved from the database.
     */
    id: ReadProps['id']
    /**
     * If you already have the resource's props (e.g., an authorizer assigned them to context),
     * you can avoid another database query by passing them through.
     *
     * Otherwise, the props will be retrieved from the database using the `id`.
     */
    props?: ReadProps
  }) => {
    try {
      if (!props || props.id !== id) {
        // Read the resource from the database via the bonded DataStore.
        props = (await findById<ReadProps>(tableName, id)) ?? undefined
      }

      if (props && props.id === id) {
        // Found the resource.
        return { statusCode: 200, body: { props } }
      }
    } catch (error) {
      logger.error(error)
    }

    // If we made it here, the resource could not be found with the provided `id`.
    return {
      statusCode: 404,
      body: {
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found.' }),
        errorKey: 'resource.error.notFound',
      },
    }
  }
