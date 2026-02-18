/**
 * Zod schemas and validation utilities for resource operations.
 *
 * Every resource extends `basePropsSchema` which defines the `id`,
 * `createdAt`, and `updatedAt` fields common to all database records.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Base Zod schema with the three fields every resource row must have:
 * `id` (UUID), `createdAt` (ISO datetime), and `updatedAt` (ISO datetime).
 */
export const basePropsSchema = z.object({
  /**
   * Usually a UUID.
   */
  id: z.string().uuid(),
  /**
   * When the resource was created.
   * Usually an ISO 8601 timestamp.
   */
  createdAt: z.string().datetime(),
  /**
   * When the resource was last updated.
   * Usually an ISO 8601 timestamp.
   */
  updatedAt: z.string().datetime(),
})

/**
 * TypeScript type inferred from `basePropsSchema`, containing `id`, `createdAt`, and `updatedAt`.
 */
export type BaseProps = z.infer<typeof basePropsSchema>

/**
 * Creates a Zod schema for the standard `{ statusCode, body }` response
 * returned by resource CRUD operations.
 *
 * @param propsSchema - The Zod schema for the resource's props (e.g. `userPropsSchema`).
 * @returns A Zod schema that validates `{ statusCode: number, body: { props? } | T[] }`.
 */
export const responseSchema = <T extends z.ZodTypeAny>(propsSchema: T): z.ZodTypeAny =>
  z.object({
    statusCode: z.number(),
    body: z.union([
      z.object({
        props: propsSchema.optional(),
        error: z.string().optional(),
      }),
      z.array(propsSchema),
    ]),
  })

/**
 * Creates a Zod schema that validates a resource descriptor object
 * (`{ name, tableName, schema }`).
 *
 * @param _propsSchema - The Zod schema for the resource's props (used for type inference only).
 * @returns A Zod schema that validates the resource descriptor shape.
 */
export const resourceSchema = <T extends z.ZodTypeAny>(_propsSchema: T): z.ZodTypeAny =>
  z.object({
    name: z.string(),
    tableName: z.string(),
    schema: z.custom<T>(() => true),
  })

/**
 * Validates data against a Zod schema, throwing an `Error` with a
 * human-readable message listing all validation failures if invalid.
 *
 * @param schema - The Zod schema to validate against.
 * @param data - The data to validate.
 * @returns The parsed and typed data if validation succeeds.
 * @throws {Error} Error with comma-separated validation issue descriptions.
 */
export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Validation failed: ${errors}`)
  }
  return result.data
}

/**
 * Validates data against a Zod schema without throwing. Returns a discriminated
 * union: `{ success: true, data }` on success or `{ success: false, error }` on failure.
 *
 * @param schema - The Zod schema to validate against.
 * @param data - The data to validate.
 * @returns A discriminated union indicating success with parsed data, or failure with a `ZodError`.
 */
export const safeParse = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } => {
  return schema.safeParse(data)
}

/**
 * Creates a schema where all fields are optional, suitable for validating
 * partial update payloads where only changed fields are sent.
 *
 * @param schema - The Zod object schema to make partial.
 * @returns A new Zod schema with all fields marked optional.
 */
export const partial = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> => {
  return schema.partial()
}

/**
 * Creates a schema with only the specified fields, useful for create payloads
 * where only a subset of the full props should be provided by the client.
 *
 * @param schema - The Zod object schema to pick from.
 * @param keys - The field names to include in the new schema.
 * @returns A new Zod schema containing only the picked fields.
 */
export const pick = <T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  keys: readonly K[],
): z.ZodObject<Pick<T, K>> => {
  const shape = {} as Record<string, unknown>
  for (const key of keys) {
    shape[key as string] = schema.shape[key]
  }
  return z.object(shape) as unknown as z.ZodObject<Pick<T, K>>
}
