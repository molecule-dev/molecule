/**
 * User resource definition.
 *
 * @module
 */

import { createSchema } from './schema.js'
import type * as types from './types.js'

/**
 * Creates a user resource definition with optional OAuth servers and plan keys.
 *
 * This defines the resource; signup and login are `handlers.create(resource)` and
 * `handlers.logIn(resource)` from this package's `handlers` namespace. Signup owns password
 * validation/hashing, the user and same-id secrets rows, and the session device. A custom JSON
 * envelope does not require custom credential writes: flatten the incoming body for the handler,
 * then adapt its returned `{ statusCode, headers?, body }`. On success `body.props` is the safe
 * user and `body.accessToken` is the token; preserve other results, including validation and
 * two-factor responses. Read `handlers.create` / `handlers.logIn` for their complete contracts.
 * Retain each route's authorization and rate-limit middleware when adapting its envelope.
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
