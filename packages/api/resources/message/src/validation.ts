/**
 * Message resource input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for an individual message attachment.
 */
export const messageAttachmentSchema = z.object({
  /** Public or signed URL to the attachment. */
  url: z.string().url().max(2048),
  /** MIME type of the attachment. */
  mime: z.string().min(1).max(255),
})

/**
 * Schema for `getOrCreateThread` request input.
 */
export const getOrCreateThreadSchema = z.object({
  /** The other participant's user ID. */
  participantId: z.string().min(1).max(255),
})

/**
 * Schema for `sendMessage` request input.
 */
export const sendMessageSchema = z.object({
  /** Message body. Must be non-empty and at most 10,000 characters. */
  body: z.string().min(1).max(10_000),
  /** Optional attachments. */
  attachments: z.array(messageAttachmentSchema).max(20).optional(),
})

/**
 * Schema for `editMessage` request input.
 */
export const editMessageSchema = z.object({
  /** Updated message body. Must be non-empty and at most 10,000 characters. */
  body: z.string().min(1).max(10_000),
})
