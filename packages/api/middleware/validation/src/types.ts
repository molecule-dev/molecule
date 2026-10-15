/**
 * Type definitions for the validation middleware.
 *
 * @module
 */

import type { ZodType } from 'zod'

/**
 * Schema definition for validating different parts of a request.
 * Each key maps to a Zod schema that validates the corresponding request property.
 */
export type ValidationSchema = {
  /** Schema for validating the request body. */
  body?: ZodType
  /** Schema for validating URL params. */
  params?: ZodType
  /** Schema for validating query string parameters. */
  query?: ZodType
}

/**
 * A single validation error describing which field failed and why.
 */
export interface ValidationError {
  /** Dot-delimited path to the invalid field (e.g. `"address.city"`). */
  field: string
  /** Human-readable error message. */
  message: string
  /** Zod issue code (e.g. `"invalid_type"`, `"too_small"`). */
  code: string
}

/**
 * How a failed validation is answered.
 */
export interface ValidateOptions {
  /** HTTP status of the failure response (default `400`; an API whose spec says `422` passes it). */
  status?: number
  /**
   * Builds the failure response body from the field errors (default
   * `{ error, errors: [{ field, message, code }] }`). For an API with its own
   * error envelope, e.g. `(errors) => ({ errors: Object.fromEntries(errors.map((e) => [e.field, [e.message]])) })`.
   */
  body?: (errors: ValidationError[]) => unknown
}

/**
 * The result of validating a request against a schema.
 */
export interface ValidationResult {
  /** Whether validation passed without errors. */
  success: boolean
  /** Array of validation errors (empty when `success` is `true`). */
  errors: ValidationError[]
}
