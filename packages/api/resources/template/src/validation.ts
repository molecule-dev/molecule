/**
 * Resource template input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

const variableSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  required: z.boolean().optional(),
  description: z.string().max(512).optional(),
})

/**
 * Schema for creating a new template.
 */
export const createTemplateSchema = z.object({
  /** Resource type the template materialises (e.g. 'document'). */
  resourceType: z.string().min(1).max(255),
  /** Unique slug within `resourceType`. */
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9][a-z0-9-_]*$/),
  /** Display name. */
  name: z.string().min(1).max(255),
  /** Optional long description. */
  description: z.string().max(2048).nullable().optional(),
  /** Raw JSON snapshot — accepts any JSON-compatible value. */
  snapshot: z.unknown(),
  /** Declared template variables. */
  variables: z.array(variableSchema).optional(),
  /** Free-form tags. */
  tags: z.array(z.string().min(1).max(64)).optional(),
  /** Whether to expose the template publicly. */
  isPublic: z.boolean().optional(),
})

/**
 * Schema for updating an existing template. Every field is optional;
 * `version` is bumped automatically when at least one field changes.
 */
export const updateTemplateSchema = z.object({
  /** New display name. */
  name: z.string().min(1).max(255).optional(),
  /** New description (`null` to clear). */
  description: z.string().max(2048).nullable().optional(),
  /** Replacement snapshot. */
  snapshot: z.unknown().optional(),
  /** Replacement variables list. */
  variables: z.array(variableSchema).optional(),
  /** Replacement tags list. */
  tags: z.array(z.string().min(1).max(64)).optional(),
  /** Toggle public visibility. */
  isPublic: z.boolean().optional(),
})

/**
 * Schema for the instantiate endpoint body. The variable map accepts only
 * primitive values — placeholders inside the snapshot are string-shaped.
 */
export const instantiateSchema = z.object({
  /** Map of variable name to substitution value. */
  variables: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
})
