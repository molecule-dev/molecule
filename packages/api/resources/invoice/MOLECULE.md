# @molecule/api-resource-invoice

`@molecule/api-resource-invoice` — line-item-based invoice CRUD with
auto-computed totals (subtotal + tax), draft/sent/partial/paid/overdue/void
status, and a `recordPayment(invoiceId, amount)` helper that advances
status automatically.

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
npm install @molecule/api-resource-invoice
```

## API

### Interfaces

#### `Invoice`

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

```typescript
interface LineItem {
  description: string
  quantity: number
  unit_price: number
}
```

### Types

#### `InvoiceStatus`

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

```typescript
function createInvoiceForUser(userId: string, data: { client_id: string; items: LineItem[]; due_date?: string; notes?: string; tax_rate?: number; currency?: string; }): Promise<Invoice>
```

#### `createInvoiceRouter()`

```typescript
function createInvoiceRouter(): Router
```

#### `deleteInvoiceForUser(invoiceId, userId)`

```typescript
function deleteInvoiceForUser(invoiceId: string, userId: string): Promise<boolean>
```

#### `getInvoiceForUser(invoiceId, userId)`

```typescript
function getInvoiceForUser(invoiceId: string, userId: string): Promise<Invoice | null>
```

#### `listInvoicesForUser(userId, opts?)`

```typescript
function listInvoicesForUser(userId: string, opts?: { client_id?: string; status?: InvoiceStatus; page?: number; limit?: number; }): Promise<{ data: Invoice[]; total: number; page: number; limit: number; }>
```

#### `recordPayment(invoiceId, userId, amount)`

```typescript
function recordPayment(invoiceId: string, userId: string, amount: number): Promise<Invoice | null>
```

#### `toInvoice(row)`

```typescript
function toInvoice(row: InvoiceRow): Invoice
```

#### `updateInvoiceForUser(invoiceId, userId, patch)`

```typescript
function updateInvoiceForUser(invoiceId: string, userId: string, patch: Partial<{ items: LineItem[]; due_date: string; notes: string; tax_rate: number; currency: string; status: InvoiceStatus; }>): Promise<Invoice | null>
```

### Constants

#### `INVOICE_STATUSES`

```typescript
const INVOICE_STATUSES: readonly ["draft", "sent", "partial", "paid", "overdue", "void"]
```

#### `invoiceCreateSchema`

```typescript
const invoiceCreateSchema: z.ZodObject<{ client_id: z.ZodString; items: z.ZodArray<z.ZodObject<{ description: z.ZodString; quantity: z.ZodNumber; unit_price: z.ZodNumber; }, "strip", z.ZodTypeAny, { description: string; quantity: number; unit_price: number; }, { description: string; quantity: number; unit_price: number; }>, "many">; due_date: z.ZodOptional<z.ZodString>; notes: z.ZodOptional<z.ZodString>; tax_rate: z.ZodOptional<z.ZodNumber>; currency: z.ZodOptional<z.ZodString>; }, "strip", z.ZodTypeAny, { client_id: string; items: { description: string; quantity: number; unit_price: number; }[]; due_date?: string | undefined; notes?: string | undefined; tax_rate?: number | undefined; currency?: string | undefined; }, { client_id: string; items: { description: string; quantity: number; unit_price: number; }[]; due_date?: string | undefined; notes?: string | undefined; tax_rate?: number | undefined; currency?: string | undefined; }>
```

#### `invoiceUpdateSchema`

```typescript
const invoiceUpdateSchema: z.ZodObject<{ items: z.ZodOptional<z.ZodArray<z.ZodObject<{ description: z.ZodString; quantity: z.ZodNumber; unit_price: z.ZodNumber; }, "strip", z.ZodTypeAny, { description: string; quantity: number; unit_price: number; }, { description: string; quantity: number; unit_price: number; }>, "many">>; due_date: z.ZodOptional<z.ZodString>; notes: z.ZodOptional<z.ZodString>; tax_rate: z.ZodOptional<z.ZodNumber>; currency: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<["draft", "sent", "partial", "paid", "overdue", "void"]>>; }, "strip", z.ZodTypeAny, { status?: "draft" | "sent" | "partial" | "paid" | "overdue" | "void" | undefined; items?: { description: string; quantity: number; unit_price: number; }[] | undefined; due_date?: string | undefined; notes?: string | undefined; tax_rate?: number | undefined; currency?: string | undefined; }, { status?: "draft" | "sent" | "partial" | "paid" | "overdue" | "void" | undefined; items?: { description: string; quantity: number; unit_price: number; }[] | undefined; due_date?: string | undefined; notes?: string | undefined; tax_rate?: number | undefined; currency?: string | undefined; }>
```

#### `lineItemSchema`

```typescript
const lineItemSchema: z.ZodObject<{ description: z.ZodString; quantity: z.ZodNumber; unit_price: z.ZodNumber; }, "strip", z.ZodTypeAny, { description: string; quantity: number; unit_price: number; }, { description: string; quantity: number; unit_price: number; }>
```

#### `recordPaymentSchema`

```typescript
const recordPaymentSchema: z.ZodObject<{ amount: z.ZodNumber; }, "strip", z.ZodTypeAny, { amount: number; }, { amount: number; }>
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

Run `src/__setup__/invoices.sql` once. The bundled `computeTotals(items, taxRate)`
helper is exported for client-side total previews.
