/**
 * `@molecule/api-resource-invoice` — line-item-based invoice CRUD with
 * auto-computed totals (subtotal + tax), draft/sent/partial/paid/overdue/void
 * status, and a `recordPayment(invoiceId, userId, amount)` helper that
 * advances status automatically.
 *
 * Extracted from the invoice-billing flagship.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   createInvoiceForUser,
 *   createInvoiceRouter,
 *   recordPayment,
 * } from '@molecule/api-resource-invoice'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL), then mount the
 * // router AFTER the global auth middleware that sets res.locals.session (else every call 401s).
 * setStore(store)
 * const app = express()
 * app.use(express.json())
 * app.use('/invoices', createInvoiceRouter()) // GET/POST /invoices, GET/PUT/DELETE /:id, POST /:id/payment
 *
 * // Server-side equivalent of POST /invoices then POST /invoices/:id/payment, as the SESSION user:
 * const userId = 'user-123'
 * const invoice = await createInvoiceForUser(userId, {
 *   client_id: 'acme-co',
 *   items: [{ description: 'Consulting', quantity: 10, unit_price: 250 }],
 *   tax_rate: 8.5, // PERCENT, not a fraction
 * })
 * console.log(invoice.number, invoice.status, invoice.total) // e.g. 'INV-2026-0001' 'draft' 2712.5
 *
 * const paid = await recordPayment(invoice.id, userId, 2712.5) // null if not the caller's invoice
 * console.log(paid?.status, paid?.amount_paid) // 'paid' 2712.5 (less than total → 'partial')
 * ```
 *
 * @remarks
 * **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`) —
 * every service call and route goes through it.
 *
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
 * Money is plain decimal numbers in the invoice `currency` (not cents), and
 * `tax_rate` is a percent (`8.5` = 8.5%). `recordPayment` does NOT reject an
 * overpayment or a payment on a `paid`/`void` invoice — it adds the amount and
 * sets `partial`/`paid`; enforce those rules in your route if you need them.
 * Nothing flips a status to `overdue` or `sent` automatically — set it via
 * `updateInvoiceForUser` / `PUT /invoices/:id`. `GET /invoices` paginates by
 * `page` (1-based, default `limit` 50) and returns `{ data, total, page, limit }`.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating an invoice with line items auto-computes the money: add a
 *   line (quantity × unit_price) and the subtotal updates, the tax_rate is
 *   applied (tax_amount = subtotal × rate / 100), and total = subtotal +
 *   tax_amount — matching `computeTotals` down to the rounded cents shown in
 *   the UI. Change a quantity or add another line and every figure re-computes.
 * - [ ] The status lifecycle advances correctly through INVOICE_STATUSES: a
 *   freshly created invoice reads `draft`; sending it moves it to `sent`; a
 *   `recordPayment` for LESS than the balance flips it to `partial`; paying the
 *   remaining balance flips it to `paid` and stamps a paid date. The
 *   balance-due shown to the user (total - amount_paid) is correct after each
 *   step.
 * - [ ] Terminal/edge states read right: an unpaid invoice past its due_date
 *   shows `overdue`, a cancelled one shows `void`, and once an invoice is `paid`
 *   or `void` the UI blocks further line-item/total edits as designed.
 * - [ ] Overpayment and dead-invoice payments are rejected, not silently
 *   over-applied: recording an amount greater than the outstanding balance, or
 *   any payment against an already-`paid` or `void` invoice, fails with a
 *   visible error and leaves amount_paid + status unchanged.
 * - [ ] AUTHORIZATION: a signed-in user sees and mutates only THEIR OWN
 *   invoices — every path is `*ForUser`-scoped (listInvoicesForUser /
 *   getInvoiceForUser / updateInvoiceForUser / recordPayment). Guessing or
 *   tampering another user's invoice id on GET/PUT/DELETE/:id/payment returns
 *   403/404 — never that invoice's data and never a cross-user payment.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
