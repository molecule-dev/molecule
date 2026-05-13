import { z } from 'zod'

export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'] as const

export const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
})

export const invoiceCreateSchema = z.object({
  client_id: z.string().min(1),
  items: z.array(lineItemSchema).min(1),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  currency: z.string().min(3).max(8).optional(),
})

export const invoiceUpdateSchema = z.object({
  items: z.array(lineItemSchema).optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  currency: z.string().min(3).max(8).optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
})

export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
})
