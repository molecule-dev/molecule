import { z } from 'zod'

/** Allowed status values for a forum thread. */
export const THREAD_STATUSES = ['open', 'closed', 'locked', 'archived'] as const

/** Validates the request body for creating a new forum thread. */
export const threadCreateSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(50_000),
  category_id: z.string().uuid().nullable().optional(),
})

/** Validates the request body for updating an existing forum thread. */
export const threadUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  body: z.string().min(1).max(50_000).optional(),
  category_id: z.string().uuid().nullable().optional(),
  status: z.enum(THREAD_STATUSES).optional(),
  is_pinned: z.boolean().optional(),
})

/** Validates the request body for creating a reply on a forum thread. */
export const replyCreateSchema = z.object({
  body: z.string().min(1).max(20_000),
  parent_reply_id: z.string().uuid().nullable().optional(),
})

/** Validates the request body for casting a vote (+1 or -1) on a thread or reply. */
export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
})

/** Validates query parameters for listing forum threads with filtering, sorting, and pagination. */
export const threadListQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  status: z.enum(THREAD_STATUSES).optional(),
  sort: z.enum(['recent', 'top', 'pinned']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
