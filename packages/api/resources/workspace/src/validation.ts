/**
 * Workspace input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

import { WORKSPACE_ROLES } from './types.js'

/**
 * Schema for validating workspace creation input.
 */
export const createWorkspaceSchema = z.object({
  /** The workspace's display name. */
  name: z.string().min(1).max(255),
  /** Optional URL-safe slug; auto-generated from `name` when omitted. */
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
})

/**
 * Schema for validating workspace update input.
 */
export const updateWorkspaceSchema = z.object({
  /** Updated workspace display name. */
  name: z.string().min(1).max(255).optional(),
  /** Updated URL-safe slug. */
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
})

/**
 * Schema for validating member invite input.
 */
export const inviteMemberSchema = z.object({
  /** The invitee's email address. */
  email: z.string().email().max(255),
  /** The role the invitee will receive on accept. */
  role: z.enum(WORKSPACE_ROLES).default('member'),
})

/**
 * Schema for validating invite acceptance input.
 */
export const acceptInviteSchema = z.object({
  /** Single-use token from the invite. */
  token: z.string().min(1).max(128),
})

/**
 * Schema for validating member role updates.
 */
export const updateMemberRoleSchema = z.object({
  /** The member's new role. */
  role: z.enum(WORKSPACE_ROLES),
})
