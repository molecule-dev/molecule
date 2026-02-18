import { z } from 'zod'

/**
 * Validation schema for props.
 */
export const propsSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string().uuid(),
  platformKey: z.enum(['', 'stripe', 'apple', 'google']).default(''),
  transactionId: z.string().optional(),
  productId: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  receipt: z.string().optional(),
})

/**
 * Full payment record properties (userId, platform, transactionId, productId, data, receipt).
 */
export type Props = z.infer<typeof propsSchema>

/**
 * Zod schema for creating a payment record (picks fields required at creation time).
 */
export const createPropsSchema = propsSchema.pick({
  createdAt: true,
  updatedAt: true,
  userId: true,
  platformKey: true,
  transactionId: true,
  productId: true,
  data: true,
  receipt: true,
})

/**
 * Fields required when creating a new payment record.
 */
export type CreateProps = z.infer<typeof createPropsSchema>

/**
 * Zod schema for updating a payment record (data and receipt only).
 */
export const updatePropsSchema = propsSchema
  .pick({
    data: true,
    receipt: true,
  })
  .partial()

/**
 * Updatable payment record fields (data and receipt).
 */
export type UpdateProps = z.infer<typeof updatePropsSchema>
