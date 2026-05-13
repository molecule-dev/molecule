import { z } from 'zod'

export const THREAD_STATUSES = ['open', 'closed', 'locked', 'archived'] as const

export const threadCreateSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(50_000),
  category_id: z.string().uuid().nullable().optional(),
})

export const threadUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  body: z.string().min(1).max(50_000).optional(),
  category_id: z.string().uuid().nullable().optional(),
  status: z.enum(THREAD_STATUSES).optional(),
  is_pinned: z.boolean().optional(),
})

export const replyCreateSchema = z.object({
  body: z.string().min(1).max(20_000),
  parent_reply_id: z.string().uuid().nullable().optional(),
})

export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
})

export const threadListQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  status: z.enum(THREAD_STATUSES).optional(),
  sort: z.enum(['recent', 'top', 'pinned']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
