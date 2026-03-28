/**
 * Thread input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for validating thread creation input.
 */
export const createThreadSchema = z.object({
  /** Thread title. Must be non-empty and at most 500 characters. */
  title: z.string().min(1).max(500),
  /** Optional resource type to attach the thread to. */
  resourceType: z.string().min(1).max(255).optional(),
  /** Optional resource ID to attach the thread to. */
  resourceId: z.string().min(1).max(255).optional(),
})

/**
 * Schema for validating thread update input.
 */
export const updateThreadSchema = z.object({
  /** Updated title. */
  title: z.string().min(1).max(500).optional(),
  /** Whether to close or reopen the thread. */
  closed: z.boolean().optional(),
})

/**
 * Schema for validating message creation input.
 */
export const createMessageSchema = z.object({
  /** Message body. Must be non-empty and at most 10,000 characters. */
  body: z.string().min(1).max(10_000),
})

/**
 * Schema for validating message update input.
 */
export const updateMessageSchema = z.object({
  /** Updated message body. Must be non-empty and at most 10,000 characters. */
  body: z.string().min(1).max(10_000),
})
