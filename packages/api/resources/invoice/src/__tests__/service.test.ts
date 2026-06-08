const { mockCount, mockCreate, mockDeleteById, mockFindById, mockFindMany, mockUpdateById } =
  vi.hoisted(() => ({
    mockCount: vi.fn(),
    mockCreate: vi.fn(),
    mockDeleteById: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdateById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  computeTotals,
  createInvoiceForUser,
  deleteInvoiceForUser,
  getInvoiceForUser,
  recordPayment,
  toInvoice,
  updateInvoiceForUser,
} from '../service.js'
import type { InvoiceRow, LineItem } from '../types.js'

function makeRow(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: 'inv-1',
    user_id: 'user-1',
    client_id: null,
    number: 'INV-2026-0001',
    status: 'draft',
    items: [{ description: 'Widget', quantity: 2, unit_price: 50 }],
    subtotal: 100,
    tax_rate: 10,
    tax_amount: 10,
    total: 110,
    amount_paid: 0,
    currency: 'USD',
    issue_date: '2026-05-13',
    due_date: '2026-06-13',
    paid_at: null,
    notes: null,
    created_at: '2026-05-13T10:00:00.000Z',
    updated_at: '2026-05-13T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('computeTotals', () => {
  it('sums quantity × unit_price across line items', () => {
    const items: LineItem[] = [
      { description: 'Widget', quantity: 2, unit_price: 50 },
      { description: 'Gadget', quantity: 3, unit_price: 20 },
    ]
    expect(computeTotals(items, 0)).toEqual({ subtotal: 160, tax_amount: 0, total: 160 })
  })

  it('applies tax rate as percent on subtotal', () => {
    const items: LineItem[] = [{ description: 'A', quantity: 1, unit_price: 100 }]
    expect(computeTotals(items, 10)).toEqual({ subtotal: 100, tax_amount: 10, total: 110 })
  })

  it('rounds to 2 decimal places to avoid float drift', () => {
    const items: LineItem[] = [{ description: 'A', quantity: 3, unit_price: 9.99 }]
    const { subtotal, tax_amount: taxAmount, total } = computeTotals(items, 7)
    expect(subtotal).toBe(29.97)
    expect(taxAmount).toBe(2.1) // 29.97 * 0.07 = 2.0979 → 2.10 (round-to-even 2.10 / display 2.1)
    expect(total).toBe(32.07)
  })

  it('returns zeroes for empty item list', () => {
    expect(computeTotals([], 8.25)).toEqual({ subtotal: 0, tax_amount: 0, total: 0 })
  })
})

describe('toInvoice', () => {
  it('normalises a row into the public Invoice shape', () => {
    const inv = toInvoice(makeRow())
    expect(inv.id).toBe('inv-1')
    expect(inv.issue_date).toBe('2026-05-13')
    expect(inv.due_date).toBe('2026-06-13')
    expect(inv.paid_at).toBeNull()
  })

  it('flattens Date instances into ISO/date strings', () => {
    const inv = toInvoice(
      makeRow({
        issue_date: new Date('2026-05-13T00:00:00Z') as unknown as string,
        paid_at: new Date('2026-06-01T12:00:00Z') as unknown as string,
      }),
    )
    expect(inv.issue_date).toBe('2026-05-13')
    expect(inv.paid_at).toBe('2026-06-01T12:00:00.000Z')
  })
})

describe('getInvoiceForUser', () => {
  it('returns null when missing', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getInvoiceForUser('inv-1', 'user-1')).toBeNull()
  })

  it('returns null when row belongs to another user (IDOR safety)', async () => {
    mockFindById.mockResolvedValue(makeRow({ user_id: 'user-2' }))
    expect(await getInvoiceForUser('inv-1', 'user-1')).toBeNull()
  })

  it('returns the shaped Invoice when caller owns it', async () => {
    mockFindById.mockResolvedValue(makeRow({ total: 250 }))
    const inv = await getInvoiceForUser('inv-1', 'user-1')
    expect(inv?.total).toBe(250)
  })
})

describe('createInvoiceForUser', () => {
  it('computes totals + generates invoice number + stamps user_id', async () => {
    mockCount.mockResolvedValue(3)
    mockCreate.mockResolvedValue({ data: makeRow() })
    await createInvoiceForUser('user-1', {
      client_id: 'c-1',
      items: [
        { description: 'A', quantity: 2, unit_price: 25 },
        { description: 'B', quantity: 1, unit_price: 50 },
      ],
      tax_rate: 10,
    })
    const payload = mockCreate.mock.calls[0][1]
    const year = new Date().getFullYear()
    expect(payload.user_id).toBe('user-1')
    expect(payload.number).toBe(`INV-${year}-0004`)
    expect(payload.subtotal).toBe(100)
    expect(payload.tax_amount).toBe(10)
    expect(payload.total).toBe(110)
    expect(payload.status).toBe('draft')
    expect(payload.amount_paid).toBe(0)
  })

  it('defaults currency to USD and tax_rate to 0', async () => {
    mockCount.mockResolvedValue(0)
    mockCreate.mockResolvedValue({ data: makeRow() })
    await createInvoiceForUser('user-1', {
      client_id: 'c-1',
      items: [{ description: 'A', quantity: 1, unit_price: 10 }],
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.currency).toBe('USD')
    expect(payload.tax_rate).toBe(0)
    expect(payload.tax_amount).toBe(0)
  })
})

describe('updateInvoiceForUser', () => {
  it('refuses cross-owner update', async () => {
    mockFindById.mockResolvedValue(makeRow({ user_id: 'user-2' }))
    expect(await updateInvoiceForUser('inv-1', 'user-1', { notes: 'hi' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('recomputes totals when items change', async () => {
    mockFindById.mockResolvedValueOnce(makeRow())
    mockFindById.mockResolvedValueOnce(makeRow())
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await updateInvoiceForUser('inv-1', 'user-1', {
      items: [{ description: 'Big', quantity: 1, unit_price: 500 }],
      tax_rate: 10,
    })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.subtotal).toBe(500)
    expect(patch.tax_amount).toBe(50)
    expect(patch.total).toBe(550)
  })

  it('stamps paid_at + sets amount_paid on status→paid transition', async () => {
    mockFindById.mockResolvedValueOnce(makeRow({ status: 'sent', total: 110 }))
    mockFindById.mockResolvedValueOnce(makeRow({ status: 'paid' }))
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await updateInvoiceForUser('inv-1', 'user-1', { status: 'paid' })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(typeof patch.paid_at).toBe('string')
    expect(patch.amount_paid).toBe(110)
  })

  it('does NOT restamp paid_at if already paid', async () => {
    mockFindById.mockResolvedValueOnce(
      makeRow({ status: 'paid', paid_at: '2026-05-01T00:00:00.000Z' }),
    )
    mockFindById.mockResolvedValueOnce(makeRow({ status: 'paid' }))
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await updateInvoiceForUser('inv-1', 'user-1', { status: 'paid' })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.paid_at).toBeUndefined()
  })
})

describe('deleteInvoiceForUser', () => {
  it('refuses cross-owner delete', async () => {
    mockFindById.mockResolvedValue(makeRow({ user_id: 'user-2' }))
    expect(await deleteInvoiceForUser('inv-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('deletes when caller owns', async () => {
    mockFindById.mockResolvedValue(makeRow({ user_id: 'user-1' }))
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteInvoiceForUser('inv-1', 'user-1')).toBe(true)
  })
})

describe('recordPayment', () => {
  it('refuses cross-owner', async () => {
    mockFindById.mockResolvedValue(makeRow({ user_id: 'user-2' }))
    expect(await recordPayment('inv-1', 'user-1', 50)).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('keeps status as partial when amount_paid < total', async () => {
    mockFindById.mockResolvedValueOnce(makeRow({ total: 110, amount_paid: 0 }))
    mockFindById.mockResolvedValueOnce(makeRow({ status: 'partial' }))
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await recordPayment('inv-1', 'user-1', 50)
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.status).toBe('partial')
    expect(patch.amount_paid).toBe(50)
    expect(patch.paid_at).toBeUndefined()
  })

  it('flips status to paid + stamps paid_at when amount_paid >= total', async () => {
    mockFindById.mockResolvedValueOnce(makeRow({ total: 110, amount_paid: 60 }))
    mockFindById.mockResolvedValueOnce(makeRow({ status: 'paid' }))
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await recordPayment('inv-1', 'user-1', 50)
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.status).toBe('paid')
    expect(patch.amount_paid).toBe(110)
    expect(typeof patch.paid_at).toBe('string')
  })

  it('accumulates fractional payments without float drift', async () => {
    mockFindById.mockResolvedValueOnce(makeRow({ total: 100, amount_paid: 33.33 }))
    mockFindById.mockResolvedValueOnce(makeRow({}))
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await recordPayment('inv-1', 'user-1', 33.34)
    expect(mockUpdateById.mock.calls[0][2].amount_paid).toBe(66.67)
  })
})
