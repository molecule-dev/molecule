/**
 * `@molecule/api-resource-invoice` — line-item-based invoice CRUD with
 * auto-computed totals (subtotal + tax), draft/sent/partial/paid/overdue/void
 * status, and a `recordPayment(invoiceId, userId, amount)` helper that
 * advances status automatically.
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
 * Table: `src/__setup__/invoices.sql` creates the single `invoices` table. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once. The bundled `computeTotals(items, taxRate)`
 * helper is exported for client-side total previews.
 *
 * Everything is owner-scoped: service functions take the authenticated
 * `userId` and return `null`/`false` for rows the caller doesn't own, and the
 * router reads the caller from `res.locals.session` (mount behind your global
 * auth middleware; 401 otherwise). `recordPayment` is bookkeeping — "record a
 * payment I received" against my own invoice — it never talks to a payment
 * provider; wire actual charging separately (see `@molecule/api-payments`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
