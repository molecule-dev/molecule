/**
 * Resource-share input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

import { SHARE_ROLES } from './types.js'

const principalTypeSchema = z.enum(['user', 'team', 'public'])
const roleSchema = z.enum(SHARE_ROLES)

/**
 * Schema for granting a share to a principal.
 */
export const grantShareSchema = z.object({
  /** Type of resource being shared (e.g. 'document'). */
  resourceType: z.string().min(1).max(255),
  /** ID of the resource being shared. */
  resourceId: z.string().min(1).max(255),
  /** Category of principal receiving the grant. */
  principalType: principalTypeSchema,
  /** ID of the principal (user ID, team ID, or '*' for public). */
  principalId: z.string().min(1).max(255),
  /** Role to grant. */
  role: roleSchema,
  /** Optional ISO 8601 expiry. */
  expiresAt: z.string().datetime().nullable().optional(),
})

/**
 * Schema for updating an existing share's role and/or expiry.
 */
export const updateShareSchema = z.object({
  /** New role. */
  role: roleSchema.optional(),
  /** New expiry. Pass `null` to clear. */
  expiresAt: z.string().datetime().nullable().optional(),
})

/**
 * Schema for creating a public share link.
 */
export const createShareLinkSchema = z.object({
  /** Resource type. */
  resourceType: z.string().min(1).max(255),
  /** Resource ID. */
  resourceId: z.string().min(1).max(255),
  /** Role granted to anyone holding the link. */
  role: roleSchema,
  /** Optional ISO 8601 expiry. */
  expiresAt: z.string().datetime().nullable().optional(),
})
