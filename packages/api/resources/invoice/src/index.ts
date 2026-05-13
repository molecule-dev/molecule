/**
 * `@molecule/api-resource-invoice` — line-item-based invoice CRUD with
 * auto-computed totals (subtotal + tax), draft/sent/partial/paid/overdue/void
 * status, and a `recordPayment(invoiceId, amount)` helper that advances
 * status automatically.
 *
 * Extracted from the invoice-billing flagship.
 *
 * @example
 * ```ts
 * import { createInvoiceRouter } from '@molecule/api-resource-invoice'
 * app.use('/invoices', createInvoiceRouter())
 * ```
 *
 * @example
 * ```ts
 * import { createInvoiceForUser, recordPayment } from '@molecule/api-resource-invoice'
 *
 * const inv = await createInvoiceForUser(userId, {
 *   client_id: 'acme-co',
 *   items: [{ description: 'Consulting', quantity: 10, unit_price: 250 }],
 *   tax_rate: 8.5,
 * })
 * await recordPayment(inv.id, userId, 2710.00) // marks paid
 * ```
 *
 * @remarks
 * Run `src/__setup__/invoices.sql` once. The bundled `computeTotals(items, taxRate)`
 * helper is exported for client-side total previews.
 *
 * @module
 */

export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
