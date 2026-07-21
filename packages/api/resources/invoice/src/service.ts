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

/** Round a number to two decimal places for currency precision. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Compute subtotal/tax/total from line items + tax rate (percent 0-100). */
export function computeTotals(
  items: LineItem[],
  taxRate: number,
): { subtotal: number; tax_amount: number; total: number } {
  const subtotal = round2(items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0))
  const taxAmount = round2(subtotal * (taxRate / 100))
  const total = round2(subtotal + taxAmount)
  return { subtotal, tax_amount: taxAmount, total }
}

/** Convert a string, Date, or null to an ISO 8601 string, or null if absent. */
function toIso(value: string | Date | null): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

/** Convert a string, Date, or null to a YYYY-MM-DD date string, or null if absent. */
function toDateString(value: string | Date | null): string | null {
  const iso = toIso(value)
  if (!iso) return null
  return iso.length >= 10 ? iso.slice(0, 10) : iso
}

/** Map a raw database InvoiceRow to a normalized Invoice with ISO date strings. */
export function toInvoice(row: InvoiceRow): Invoice {
  return {
    ...row,
    // pg returns `numeric` columns as strings (precision guard); the Invoice
    // contract and every downstream math site expect numbers. Coerce here so
    // comparisons ("paid >= total") and JSON responses are numeric.
    subtotal: Number(row.subtotal),
    tax_rate: Number(row.tax_rate),
    tax_amount: Number(row.tax_amount),
    total: Number(row.total),
    amount_paid: Number(row.amount_paid),
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

/** List all invoices for a user, with optional client/status filters and pagination. */
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

/** Fetch a single invoice by ID, returning null if not found or not owned by the user. */
export async function getInvoiceForUser(
  invoiceId: string,
  userId: string,
): Promise<Invoice | null> {
  const row = await findById<InvoiceRow>(TABLE, invoiceId)
  if (!row || row.user_id !== userId) return null
  return toInvoice(row)
}

/** Create a new draft invoice for a user, computing totals from line items and tax rate. */
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

/** Apply a partial update to a user-owned invoice, recomputing totals and marking paid_at when status becomes paid. */
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
    // pg numerics arrive as strings — the ?? fallback must be numeric before
    // it reaches computeTotals' multiplication.
    const taxRate = patch.tax_rate ?? Number(existing.tax_rate)
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

/** Delete a user-owned invoice by ID, returning false if not found or not owned by the user. */
export async function deleteInvoiceForUser(invoiceId: string, userId: string): Promise<boolean> {
  const row = await findById<InvoiceRow>(TABLE, invoiceId)
  if (!row || row.user_id !== userId) return false
  await deleteById(TABLE, invoiceId)
  return true
}

/** Record a payment amount against an invoice, updating amount_paid and transitioning status to partial or paid. */
export async function recordPayment(
  invoiceId: string,
  userId: string,
  amount: number,
): Promise<Invoice | null> {
  const existing = await findById<InvoiceRow>(TABLE, invoiceId)
  if (!existing || existing.user_id !== userId) return null
  // pg numerics arrive as strings — coerce before arithmetic or the addition
  // string-concats ("0.00" + 42000 → "0.0042000") and the paid check compares
  // strings lexicographically.
  const newPaid = round2(Number(existing.amount_paid) + amount)
  const isFullyPaid = newPaid >= Number(existing.total)
  const updates: Record<string, unknown> = {
    amount_paid: newPaid,
    status: isFullyPaid ? 'paid' : 'partial',
  }
  if (isFullyPaid) updates.paid_at = new Date().toISOString()
  await updateById(TABLE, invoiceId, updates as Partial<InvoiceRow>)
  const next = await findById<InvoiceRow>(TABLE, invoiceId)
  return next ? toInvoice(next) : null
}
