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
