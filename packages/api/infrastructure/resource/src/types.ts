/**
 * Core type definitions for the resource CRUD framework.
 *
 * Defines the `Props`, `Resource`, and `Response` interfaces used by
 * the `create`, `read`, `update`, `del`, and `query` handler factories.
 *
 * @module
 */

import type { z } from 'zod'

import type { BaseProps } from './schema.js'

// Re-export BaseProps for convenience
export type { BaseProps }

/**
 * The resource's properties to be stored in the database.
 *
 * Used by CRUD operations for type inference.
 */
export interface Props {
  /**
   * Usually a UUID.
   */
  id: string
  /**
   * When the resource was created.
   *
   * Usually an ISO 8601 timestamp.
   */
  createdAt: string
  /**
   * When the resource was last updated.
   *
   * Usually an ISO 8601 timestamp.
   */
  updatedAt: string
}

/**
 * An object describing the resource.
 *
 * The schema can be a Zod schema (z.ZodTypeAny) for new code,
 * or any other schema type for backward compatibility.
 */
export interface Resource<T = unknown> {
  /**
   * The name of the resource.
   *
   * @example User
   */
  name: string
  /**
   * The database table name for the resource.
   *
   * @example users
   */
  tableName: string
  /**
   * The schema used when validating props.
   *
   * Can be a Zod schema (z.ZodTypeAny) or other schema formats.
   */
  schema: T
}

/**
 * An object describing the resource with a Zod schema.
 *
 * Use this type when you want to enforce Zod schema usage.
 */
export interface ZodResource<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  tableName: string
  schema: T
}

/**
 * Standard response from resource operations.
 */
export interface Response<T = unknown> {
  /**
   * HTTP status code to return.
   */
  statusCode: number
  /**
   * The response payload.
   */
  body:
    | {
        props?: T
        error?: string
        errorKey?: string
      }
    | T[]
}
