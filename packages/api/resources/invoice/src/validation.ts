import { z } from 'zod'

/** All valid lifecycle statuses an invoice can hold. */
export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'] as const

/** Zod schema for a single invoice line item (description, quantity, unit price). */
export const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
})

/** Zod schema for creating a new invoice (client, items, optional due date / notes / tax / currency). */
export const invoiceCreateSchema = z.object({
  client_id: z.string().min(1),
  items: z.array(lineItemSchema).min(1),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  currency: z.string().min(3).max(8).optional(),
})

/** Zod schema for partially updating an existing invoice (all fields optional). */
export const invoiceUpdateSchema = z.object({
  items: z.array(lineItemSchema).optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  currency: z.string().min(3).max(8).optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
})

/** Zod schema for recording a payment against an invoice (positive amount required). */
export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
})
