/**
 * Status resource type definitions.
 *
 * Types are inferred from Zod schemas in schema.ts.
 *
 * @module
 */

import type * as resourceTypes from '@molecule/api-resource/types'

export type {
  CheckProps,
  CreateIncidentProps,
  CreateServiceProps,
  IncidentProps,
  ServiceProps,
  UpdateIncidentProps,
  UpdateServiceProps,
  UptimeWindowProps,
} from './schema.js'

/**
 * An object describing the `status` resource.
 */
export type Resource<T = unknown> = resourceTypes.Resource<T>
