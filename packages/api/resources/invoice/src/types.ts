export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void'

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

export interface InvoiceRow {
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

export interface Invoice extends Omit<
  InvoiceRow,
  'issue_date' | 'due_date' | 'paid_at' | 'created_at' | 'updated_at'
> {
  issue_date: string
  due_date: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}
