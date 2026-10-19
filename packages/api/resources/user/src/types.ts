/**
 * User type definitions.
 *
 * Types are inferred from Zod schemas in schema.ts.
 *
 * @module
 */

import type * as resourceTypes from '@molecule/api-resource/types'

// Re-export all types from schema
export type {
  CreateOAuthProps,
  CreateProps,
  CreateSecretProps,
  Props,
  SecretProps,
  Session,
  UpdatePasswordSecretProps,
  UpdatePlanProps,
  UpdateProps,
  VerifyTwoFactorProps,
  VerifyTwoFactorSecretProps,
} from './schema.js'

/**
 * An object describing the `user` resource.
 */
export type Resource<T = unknown> = resourceTypes.Resource<T>

/**
 * Configuration accepted by every user handler factory (`handlers.create`,
 * `handlers.logIn`, `handlers.update`, …).
 *
 * `name` and `tableName` are the caller's to supply, because an app may mount the
 * user resource on its own table. `schema` is OPTIONAL — no factory requires you
 * to invent one:
 *
 * - `handlers.create` and `handlers.logInOAuth` validate the props they write and
 *   default to this package's {@link propsSchema} when `schema` is omitted.
 * - `handlers.update` validates with the package's `updatePropsSchema` and ignores
 *   a supplied `schema`.
 * - The remaining handlers read/write rows directly and never look at `schema`.
 *
 * Omission is NOT "no validation": the handlers that validate use
 * {@link propsSchema}. Pass `createResource({ oauthServers, planKeys })` (or the
 * `resource` export) when the app constrains `oauthServer` / `planKey`, and pass
 * your own extended Zod object only when you add fields.
 *
 * @example
 * ```ts
 * handlers.create({ name: 'User', tableName: 'users' }) // validates with propsSchema
 * handlers.create(createResource({ oauthServers: ['google'] as const }))
 * ```
 */
export interface HandlerResource {
  /** The resource name used in error messages (e.g. `'User'`). */
  name: string
  /** The database table name for users. */
  tableName: string
  /**
   * Optional Zod schema validated by `handlers.create` / `handlers.logInOAuth`.
   * Defaults to {@link propsSchema}. Must expose `safeParse`; a stub object is not
   * a schema and the first request answers 400 `resource.error.unknownError` with
   * `TypeError: schema.safeParse is not a function`.
   */
  schema?: unknown
}
