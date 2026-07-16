# @molecule/api-resource-invoice

`@molecule/api-resource-invoice` — line-item-based invoice CRUD with
auto-computed totals (subtotal + tax), draft/sent/partial/paid/overdue/void
status, and a `recordPayment(invoiceId, userId, amount)` helper that
advances status automatically.

Extracted from the invoice-billing flagship.

## Quick Start

```ts
import { createInvoiceRouter } from '@molecule/api-resource-invoice'
app.use('/invoices', createInvoiceRouter())
```

```ts
import { createInvoiceForUser, recordPayment } from '@molecule/api-resource-invoice'

const inv = await createInvoiceForUser(userId, {
  client_id: 'acme-co',
  items: [{ description: 'Consulting', quantity: 10, unit_price: 250 }],
  tax_rate: 8.5,
})
await recordPayment(inv.id, userId, 2710.00) // marks paid
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-invoice @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `Invoice`

Normalized invoice with all date fields serialized to ISO strings for API responses.

```typescript
interface Invoice extends Omit<
  InvoiceRow,
  'issue_date' | 'due_date' | 'paid_at' | 'created_at' | 'updated_at'
> {
  issue_date: string
  due_date: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}
```

#### `InvoiceRow`

Raw database row shape for an invoice, with date fields typed as string or Date.

```typescript
interface InvoiceRow {
  id: string
  user_id: string
  client_id: string
  number: string
  status: InvoiceStatus
  items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  currency: string
  issue_date: string | Date
  due_date: string | Date | null
  paid_at: string | Date | null
  notes: string | null
  created_at: string | Date
  updated_at: string | Date
}
```

#### `LineItem`

A single billable line on an invoice, with description, quantity, and unit price.

```typescript
interface LineItem {
  description: string
  quantity: number
  unit_price: number
}
```

### Types

#### `InvoiceStatus`

Lifecycle states an invoice can be in, from initial draft through payment or cancellation.

```typescript
type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'
```

### Functions

#### `computeTotals(items, taxRate)`

Compute subtotal/tax/total from line items + tax rate (percent 0-100).

```typescript
function computeTotals(items: LineItem[], taxRate: number): { subtotal: number; tax_amount: number; total: number; }
```

#### `createInvoiceForUser(userId, data)`

Create a new draft invoice for a user, computing totals from line items and tax rate.

```typescript
function createInvoiceForUser(userId: string, data: { client_id: string; items: LineItem[]; due_date?: string; notes?: string; tax_rate?: number; currency?: string; }): Promise<Invoice>
```

#### `createInvoiceRouter()`

Creates and returns an Express router with all CRUD + payment routes for invoices.

```typescript
function createInvoiceRouter(): Router
```

#### `deleteInvoiceForUser(invoiceId, userId)`

Delete a user-owned invoice by ID, returning false if not found or not owned by the user.

```typescript
function deleteInvoiceForUser(invoiceId: string, userId: string): Promise<boolean>
```

#### `getInvoiceForUser(invoiceId, userId)`

Fetch a single invoice by ID, returning null if not found or not owned by the user.

```typescript
function getInvoiceForUser(invoiceId: string, userId: string): Promise<Invoice | null>
```

#### `listInvoicesForUser(userId, opts?)`

List all invoices for a user, with optional client/status filters and pagination.

```typescript
function listInvoicesForUser(userId: string, opts?: { client_id?: string; status?: InvoiceStatus; page?: number; limit?: number; }): Promise<{ data: Invoice[]; total: number; page: number; limit: number; }>
```

#### `recordPayment(invoiceId, userId, amount)`

Record a payment amount against an invoice, updating amount_paid and transitioning status to partial or paid.

```typescript
function recordPayment(invoiceId: string, userId: string, amount: number): Promise<Invoice | null>
```

#### `toInvoice(row)`

Map a raw database InvoiceRow to a normalized Invoice with ISO date strings.

```typescript
function toInvoice(row: InvoiceRow): Invoice
```

#### `updateInvoiceForUser(invoiceId, userId, patch)`

Apply a partial update to a user-owned invoice, recomputing totals and marking paid_at when status becomes paid.

```typescript
function updateInvoiceForUser(invoiceId: string, userId: string, patch: Partial<{ items: LineItem[]; due_date: string; notes: string; tax_rate: number; currency: string; status: InvoiceStatus; }>): Promise<Invoice | null>
```

### Constants

#### `INVOICE_STATUSES`

All valid lifecycle statuses an invoice can hold.

```typescript
const INVOICE_STATUSES: readonly ["draft", "sent", "partial", "paid", "overdue", "void"]
```

#### `invoiceCreateSchema`

Zod schema for creating a new invoice (client, items, optional due date / notes / tax / currency).

```typescript
const invoiceCreateSchema: z.ZodObject<{ client_id: z.ZodString; items: z.ZodArray<z.ZodObject<{ description: z.ZodString; quantity: z.ZodNumber; unit_price: z.ZodNumber; }, z.core.$strip>>; due_date: z.ZodOptional<z.ZodString>; notes: z.ZodOptional<z.ZodString>; tax_rate: z.ZodOptional<z.ZodNumber>; currency: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `invoiceUpdateSchema`

Zod schema for partially updating an existing invoice (all fields optional).

```typescript
const invoiceUpdateSchema: z.ZodObject<{ items: z.ZodOptional<z.ZodArray<z.ZodObject<{ description: z.ZodString; quantity: z.ZodNumber; unit_price: z.ZodNumber; }, z.core.$strip>>>; due_date: z.ZodOptional<z.ZodString>; notes: z.ZodOptional<z.ZodString>; tax_rate: z.ZodOptional<z.ZodNumber>; currency: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<{ draft: "draft"; sent: "sent"; partial: "partial"; paid: "paid"; overdue: "overdue"; void: "void"; }>>; }, z.core.$strip>
```

#### `lineItemSchema`

Zod schema for a single invoice line item (description, quantity, unit price).

```typescript
const lineItemSchema: z.ZodObject<{ description: z.ZodString; quantity: z.ZodNumber; unit_price: z.ZodNumber; }, z.core.$strip>
```

#### `recordPaymentSchema`

Zod schema for recording a payment against an invoice (positive amount required).

```typescript
const recordPaymentSchema: z.ZodObject<{ amount: z.ZodNumber; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Table: `src/__setup__/invoices.sql` creates the single `invoices` table. An
mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
anywhere else run it once. The bundled `computeTotals(items, taxRate)`
helper is exported for client-side total previews.

Everything is owner-scoped: service functions take the authenticated
`userId` and return `null`/`false` for rows the caller doesn't own, and the
router reads the caller from `res.locals.session` (mount behind your global
auth middleware; 401 otherwise). `recordPayment` is bookkeeping — "record a
payment I received" against my own invoice — it never talks to a payment
provider; wire actual charging separately (see `@molecule/api-payments`).
