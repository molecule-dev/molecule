/**
 * Device resource definition.
 *
 * @module
 */

import { propsSchema } from './schema.js'
import type * as types from './types.js'

/**
 * The device resource definition.
 */
export const resource: types.Resource = {
  name: `Device`,
  tableName: `devices`,
  schema: propsSchema,
}
