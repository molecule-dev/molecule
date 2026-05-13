import { z } from 'zod'

export const FLAG_TYPES = ['boolean', 'multivariate', 'string', 'number'] as const
export const FLAG_STATES = ['on', 'off', 'killed', 'scheduled'] as const

export const flagCreateSchema = z.object({
  project_id: z.string().uuid().optional(),
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  flag_type: z.enum(FLAG_TYPES).optional(),
  default_value: z.unknown().optional(),
  rollout_percentage: z.number().int().min(0).max(100).optional(),
  is_enabled: z.boolean().optional(),
  environment: z.string().min(1).max(64).optional(),
  stale_days: z.number().int().min(0).optional(),
})

export const flagUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  default_value: z.unknown().optional(),
  rollout_percentage: z.number().int().min(0).max(100).optional(),
  is_enabled: z.boolean().optional(),
  state: z.enum(FLAG_STATES).optional(),
  environment: z.string().min(1).max(64).optional(),
  stale_days: z.number().int().min(0).optional(),
})

export const flagListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  project_id: z.string().uuid().optional(),
  environment: z.string().min(1).max(64).optional(),
  state: z.enum(FLAG_STATES).optional(),
})

export const ruleSchema = z.object({
  attribute: z.string().min(1).max(120),
  operator: z.string().min(1).max(40),
  value: z.unknown().optional(),
  serve_value: z.unknown().optional(),
  priority: z.number().int().min(0).max(10_000).optional(),
  description: z.string().max(2000).optional(),
})
