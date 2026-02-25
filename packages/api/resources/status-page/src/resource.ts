/**
 * Status resource definition.
 *
 * @module
 */

import { servicePropsSchema } from './schema.js'
import type * as types from './types.js'

/**
 * Creates a new status resource definition.
 *
 * @returns The status resource descriptor with name, tableName, and schema.
 */
export const createResource = (): types.Resource => ({
  name: 'Service',
  tableName: 'services',
  schema: servicePropsSchema,
})

/**
 * The status resource definition.
 */
export const resource: types.Resource = createResource()
