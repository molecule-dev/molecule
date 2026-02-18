/**
 * Resource delete operation.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import type * as types from './types.js'

/**
 * Creates a handler to delete a resource by its `id`.
 *
 * > **Note:** We use `del` everywhere instead of `delete` since `delete` is a reserved keyword in JavaScript.
 *
 * Uses the bonded DataStore from `@molecule/api-database` for database-agnostic operations.
 *
 * Example usage:
 * ```ts
 * import { del as resourceDel } from '`@molecule/api-resource`'
 * import type * as types from '../../types.js'
 *
 * export const del = ({ name, tableName, schema }: types.Resource) => {
 *   const del = resourceDel({ name, tableName, schema })
 *
 *   return async (req: MoleculeRequest) => {
 *     const id = req.params.id
 *     return await del({ id })
 *   }
 * }
 * ```
 * @param resource - The resource descriptor.
 * @param resource.name - Human-readable resource name used in error messages (e.g. `'User'`).
 * @param resource.tableName - Database table to delete the row from.
 * @returns A curried async function that accepts `{ id }` and returns a `{ statusCode, body }` response.
 */
export const del =
  <
    Props extends types.Props = types.Props,
    DeletedResource extends types.Resource<Props> = types.Resource<Props>,
  >({
    name,
    tableName,
  }: DeletedResource) =>
  async ({
    id,
  }: {
    /**
     * The `id` of the resource to be deleted.
     */
    id: Props['id']
  }) => {
    try {
      // Delete the resource from the database via the bonded DataStore.
      const result = await deleteById(tableName, id)

      if (!result || !result.affected) {
        return {
          statusCode: 404,
          body: {
            error: t('resource.error.notFound', undefined, { defaultValue: 'Not found.' }),
            errorKey: 'resource.error.notFound',
          },
        }
      }

      // If we made it here, updates to the database were successful.
      return { statusCode: 200, body: { props: { id } } }
    } catch (error) {
      logger.error(error)
      return {
        statusCode: (error as { statusCode?: number }).statusCode || 400,
        body: {
          error: t(
            'resource.error.unableToDelete',
            { name },
            { defaultValue: `Unable to delete ${name}.` },
          ),
          errorKey: 'resource.error.unableToDelete',
        },
      }
    }
  }
