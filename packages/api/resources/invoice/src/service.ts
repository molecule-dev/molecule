/**
 * Invoice service — line-item-based invoicing with totals/tax computation.
 *
 * @module
 */

import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

import type { Invoice, InvoiceRow, InvoiceStatus, LineItem } from './types.js'

const TABLE = 'invoices'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Compute subtotal/tax/total from line items + tax rate (percent 0-100). */
export function computeTotals(items: LineItem[], taxRate: number) {
  const subtotal = round2(items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0))
  const tax_amount = round2(subtotal * (taxRate / 100))
  const total = round2(subtotal + tax_amount)
  return { subtotal, tax_amount, total }
}

function toIso(value: string | Date | null): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function toDateString(value: string | Date | null): string | null {
  const iso = toIso(value)
  if (!iso) return null
  return iso.length >= 10 ? iso.slice(0, 10) : iso
}

export function toInvoice(row: InvoiceRow): Invoice {
  return {
    ...row,
    issue_date: toDateString(row.issue_date) ?? '',
    due_date: toDateString(row.due_date),
    paid_at: toIso(row.paid_at),
    created_at: toIso(row.created_at) ?? '',
    updated_at: toIso(row.updated_at) ?? '',
  }
}

/** Generate an invoice number like INV-2026-0001 for a user's next invoice. */
async function nextInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear()
  const existing = await count(TABLE, [{ field: 'user_id', operator: '=', value: userId }])
  return `INV-${year}-${String(existing + 1).padStart(4, '0')}`
}

export async function listInvoicesForUser(
  userId: string,
  opts: {
    client_id?: string
    status?: InvoiceStatus
    page?: number
    limit?: number
  } = {},
): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 50
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (opts.client_id) where.push({ field: 'client_id', operator: '=', value: opts.client_id })
  if (opts.status) where.push({ field: 'status', operator: '=', value: opts.status })
  const orderBy: OrderBy[] = [
    { field: 'issue_date', direction: 'desc' },
    { field: 'created_at', direction: 'desc' },
  ]
  const offset = (page - 1) * limit
  const [rows, total] = await Promise.all([
    findMany<InvoiceRow>(TABLE, { where, orderBy, limit, offset }),
    count(TABLE, where),
  ])
  return { data: rows.map(toInvoice), total, page, limit }
}

export async function getInvoiceForUser(
  invoiceId: string,
  userId: string,
): Promise<Invoice | null> {
  const row = await findById<InvoiceRow>(TABLE, invoiceId)
  if (!row || row.user_id !== userId) return null
  return toInvoice(row)
}

export async function createInvoiceForUser(
  userId: string,
  data: {
    client_id: string
    items: LineItem[]
    due_date?: string
    notes?: string
    tax_rate?: number
    currency?: string
  },
): Promise<Invoice> {
  const taxRate = data.tax_rate ?? 0
  const totals = computeTotals(data.items, taxRate)
  const number = await nextInvoiceNumber(userId)
  const today = new Date().toISOString().slice(0, 10)
  const result = await create<InvoiceRow>(TABLE, {
    user_id: userId,
    client_id: data.client_id,
    number,
    status: 'draft',
    items: data.items,
    subtotal: totals.subtotal,
    tax_rate: taxRate,
    tax_amount: totals.tax_amount,
    total: totals.total,
    amount_paid: 0,
    currency: data.currency ?? 'USD',
    issue_date: today,
    due_date: data.due_date ?? null,
    paid_at: null,
    notes: data.notes ?? null,
  } as Partial<InvoiceRow>)
  return toInvoice(result.data!)
}

export async function updateInvoiceForUser(
  invoiceId: string,
  userId: string,
  patch: Partial<{
    items: LineItem[]
    due_date: string
    notes: string
    tax_rate: number
    currency: string
    status: InvoiceStatus
  }>,
): Promise<Invoice | null> {
  const existing = await findById<InvoiceRow>(TABLE, invoiceId)
  if (!existing || existing.user_id !== userId) return null
  const updates: Record<string, unknown> = { ...patch }
  if (patch.items || patch.tax_rate !== undefined) {
    const items = patch.items ?? existing.items
    const taxRate = patch.tax_rate ?? existing.tax_rate
    const totals = computeTotals(items, taxRate)
    updates.subtotal = totals.subtotal
    updates.tax_amount = totals.tax_amount
    updates.total = totals.total
  }
  if (patch.status === 'paid' && existing.status !== 'paid') {
    updates.paid_at = new Date().toISOString()
    updates.amount_paid = patch.items
      ? computeTotals(patch.items, patch.tax_rate ?? existing.tax_rate).total
      : existing.total
  }
  await updateById(TABLE, invoiceId, updates as Partial<InvoiceRow>)
  const next = await findById<InvoiceRow>(TABLE, invoiceId)
  return next ? toInvoice(next) : null
}

export async function deleteInvoiceForUser(invoiceId: string, userId: string): Promise<boolean> {
  const row = await findById<InvoiceRow>(TABLE, invoiceId)
  if (!row || row.user_id !== userId) return false
  await deleteById(TABLE, invoiceId)
  return true
}

export async function recordPayment(
  invoiceId: string,
  userId: string,
  amount: number,
): Promise<Invoice | null> {
  const existing = await findById<InvoiceRow>(TABLE, invoiceId)
  if (!existing || existing.user_id !== userId) return null
  const newPaid = round2(existing.amount_paid + amount)
  const isFullyPaid = newPaid >= existing.total
  const updates: Record<string, unknown> = {
    amount_paid: newPaid,
    status: isFullyPaid ? 'paid' : 'partial',
  }
  if (isFullyPaid) updates.paid_at = new Date().toISOString()
  await updateById(TABLE, invoiceId, updates as Partial<InvoiceRow>)
  const next = await findById<InvoiceRow>(TABLE, invoiceId)
  return next ? toInvoice(next) : null
}
