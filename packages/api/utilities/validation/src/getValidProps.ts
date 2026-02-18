/**
 * Zod-based validation for resource props.
 *
 * @module
 */

import type { ZodError, ZodSchema } from 'zod'

/**
 * Validates resource props against a Zod schema, returning typed valid props or throwing
 * a descriptive error with field-level messages prefixed by the resource name.
 * @param options - Validation options.
 * @param options.name - The resource name (used in error messages, e.g., `"User.email: Required"`).
 * @param options.schema - The Zod schema to validate against.
 * @param options.props - The raw props to validate.
 * @throws {Error} If validation fails, with comma-separated field error messages.
 * @returns The validated and typed props.
 */
export const getValidProps = <Props>({
  name,
  schema,
  props,
}: {
  /**
   * The name of the resource (used in error messages).
   */
  name: string
  /**
   * The Zod schema used when validating props.
   */
  schema: ZodSchema<Props>
  /**
   * The `props` to be validated.
   */
  props: unknown
}): Props => {
  const result = schema.safeParse(props)

  if (result.success) {
    return result.data
  }

  const errors = result.error.issues
    .map((e) => `${name}.${e.path.join('.')}: ${e.message}`)
    .join(', ')

  throw new Error(errors)
}

/**
 * Validates data against a Zod schema without throwing, returning a discriminated union.
 * @param schema - The Zod schema to validate against.
 * @param data - The raw data to validate.
 * @returns `{ success: true, data }` on success, or `{ success: false, error }` with a ZodError.
 */
export const safeParse = <T>(
  schema: ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: ZodError } => {
  return schema.safeParse(data)
}

/**
 * Validates data against a Zod schema, throwing a ZodError on failure.
 * @param schema - The Zod schema to validate against.
 * @param data - The raw data to validate.
 * @throws {ZodError} If validation fails.
 * @returns The validated and typed data.
 */
export const validate = <T>(schema: ZodSchema<T>, data: unknown): T => {
  return schema.parse(data)
}

// Re-export Zod types used in our API signatures
export type { ZodError, ZodSchema } from 'zod'
