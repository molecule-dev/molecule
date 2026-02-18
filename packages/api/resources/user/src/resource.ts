/**
 * User resource definition.
 *
 * @module
 */

import { createSchema } from './schema.js'
import type * as types from './types.js'

/**
 * Creates a user resource definition with optional OAuth servers and plan keys.
 * @param options - Optional configuration.
 * @param options.oauthServers - Tuple of allowed OAuth server names (e.g. `['google', 'github']`). Constrains the `oauthServer` schema field.
 * @param options.planKeys - Tuple of allowed plan key strings (e.g. `['free', 'pro']`). Constrains the `planKey` schema field.
 * @returns A `Resource` with name `'User'`, table `'users'`, and a Zod schema reflecting the options.
 */
export const createResource = <
  OAuthServers extends readonly [string, ...string[]] | undefined = undefined,
  PlanKeys extends readonly [string, ...string[]] | undefined = undefined,
>(options?: {
  oauthServers?: OAuthServers
  planKeys?: PlanKeys
}): types.Resource => ({
  name: `User`,
  tableName: `users`,
  schema: createSchema(options),
})

/**
 * Default user resource definition.
 */
export const resource: types.Resource = createResource()
