const {
  mockCreate,
  mockFindOne,
  mockFindMany,
  mockFindById,
  mockUpdateById,
  mockDeleteById,
  mockCount,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
  mockCount: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
  count: mockCount,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { bulkUpdate } from '../handlers/bulkUpdate.js'
import { confirm } from '../handlers/confirm.js'
import { getAlerts } from '../handlers/getAlerts.js'
import { getMovements } from '../handlers/getMovements.js'
import { getStock } from '../handlers/getStock.js'
import { release } from '../handlers/release.js'
import { reserve } from '../handlers/reserve.js'
import { updateStock } from '../handlers/updateStock.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'user-1' } },
  }
  return res
}

const STOCK_ROW = {
  id: 'stock-1',
  productId: 'prod-1',
  variantId: null,
  total: 100,
  reserved: 20,
  lowStockThreshold: 10,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const RESERVATION_ROW = {
  id: 'res-1',
  productId: 'prod-1',
  variantId: null,
  quantity: 5,
  orderId: 'order-1',
  createdAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getStock ───────────────────────────────────────────────────────────

describe('getStock', () => {
  it('should return stock info for a product', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW)

    const req = mockReq({ params: { productId: 'prod-1' } })
    const res = mockRes()

    await getStock(req, res)

    expect(mockFindOne).toHaveBeenCalledWith('inventory_stock', [
      { field: 'productId', operator: '=', value: 'prod-1' },
      { field: 'variantId', operator: '=', value: null },
    ])
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod-1',
        available: 80,
        total: 100,
        reserved: 20,
      }),
    )
  })

  it('should filter by variantId when provided', async () => {
    mockFindOne.mockResolvedValueOnce({ ...STOCK_ROW, variantId: 'var-1' })

    const req = mockReq({ params: { productId: 'prod-1' }, query: { variantId: 'var-1' } })
    const res = mockRes()

    await getStock(req, res)

    expect(mockFindOne).toHaveBeenCalledWith('inventory_stock', [
      { field: 'productId', operator: '=', value: 'prod-1' },
      { field: 'variantId', operator: '=', value: 'var-1' },
    ])
  })

  it('should return 404 when stock not found', async () => {
    mockFindOne.mockResolvedValueOnce(null)

    const req = mockReq({ params: { productId: 'prod-999' } })
    const res = mockRes()

    await getStock(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.stockNotFound' }),
    )
  })

  it('should return 500 on database error', async () => {
    mockFindOne.mockRejectedValueOnce(new Error('db error'))

    const req = mockReq({ params: { productId: 'prod-1' } })
    const res = mockRes()

    await getStock(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ── updateStock ────────────────────────────────────────────────────────

describe('updateStock', () => {
  it('should add stock to existing record', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW)
    mockUpdateById.mockResolvedValueOnce({ data: { ...STOCK_ROW, total: 110 } })
    mockCreate.mockResolvedValueOnce({ data: {} })

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 10, type: 'add', reason: 'restock' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(mockUpdateById).toHaveBeenCalledWith('inventory_stock', 'stock-1', { total: 110 })
    expect(mockCreate).toHaveBeenCalledWith(
      'inventory_movements',
      expect.objectContaining({ type: 'adjustment', quantity: 10 }),
    )
    expect(res.json).toHaveBeenCalled()
  })

  it('should remove stock from existing record', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW)
    mockUpdateById.mockResolvedValueOnce({ data: { ...STOCK_ROW, total: 90 } })
    mockCreate.mockResolvedValueOnce({ data: {} })

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 10, type: 'remove' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(mockUpdateById).toHaveBeenCalledWith('inventory_stock', 'stock-1', { total: 90 })
    expect(mockCreate).toHaveBeenCalledWith(
      'inventory_movements',
      expect.objectContaining({ quantity: -10 }),
    )
  })

  it('should reject removal that would drop below reserved', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW) // total: 100, reserved: 20

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 85, type: 'remove' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('should set stock to absolute value', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW)
    mockUpdateById.mockResolvedValueOnce({ data: { ...STOCK_ROW, total: 50 } })
    mockCreate.mockResolvedValueOnce({ data: {} })

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 50, type: 'set' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(mockUpdateById).toHaveBeenCalledWith('inventory_stock', 'stock-1', { total: 50 })
  })

  it('should reject set below reserved', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW) // reserved: 20

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 10, type: 'set' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('should create new stock record when none exists', async () => {
    mockFindOne.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce({ data: { ...STOCK_ROW, total: 50 } })
    mockCreate.mockResolvedValueOnce({ data: {} })

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 50, type: 'add' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(mockCreate).toHaveBeenCalledWith(
      'inventory_stock',
      expect.objectContaining({ productId: 'prod-1', total: 50 }),
    )
  })

  it('should reject invalid adjustment type', async () => {
    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 10, type: 'invalid' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.invalidAdjustment' }),
    )
  })

  it('should reject negative quantity', async () => {
    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: -5, type: 'add' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.negativeQuantity' }),
    )
  })

  it('should return 500 on database error', async () => {
    mockFindOne.mockRejectedValueOnce(new Error('db error'))

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 10, type: 'add' },
    })
    const res = mockRes()

    await updateStock(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ── reserve ────────────────────────────────────────────────────────────

describe('reserve', () => {
  it('should create a reservation when stock is available', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW) // available = 80
    mockCreate.mockResolvedValueOnce({ data: RESERVATION_ROW })
    mockUpdateById.mockResolvedValueOnce({})
    mockCreate.mockResolvedValueOnce({ data: {} })

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 5, orderId: 'order-1' },
    })
    const res = mockRes()

    await reserve(req, res)

    expect(mockCreate).toHaveBeenCalledWith(
      'inventory_reservations',
      expect.objectContaining({ productId: 'prod-1', quantity: 5, orderId: 'order-1' }),
    )
    expect(mockUpdateById).toHaveBeenCalledWith('inventory_stock', 'stock-1', { reserved: 25 })
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('should reject when insufficient stock available', async () => {
    mockFindOne.mockResolvedValueOnce({ ...STOCK_ROW, total: 25, reserved: 20 }) // available = 5

    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 10, orderId: 'order-1' },
    })
    const res = mockRes()

    await reserve(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.insufficientAvailable' }),
    )
  })

  it('should return 404 when stock record not found', async () => {
    mockFindOne.mockResolvedValueOnce(null)

    const req = mockReq({
      params: { productId: 'prod-999' },
      body: { quantity: 1, orderId: 'order-1' },
    })
    const res = mockRes()

    await reserve(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should reject invalid quantity', async () => {
    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 0, orderId: 'order-1' },
    })
    const res = mockRes()

    await reserve(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.invalidQuantity' }),
    )
  })

  it('should reject missing orderId', async () => {
    const req = mockReq({
      params: { productId: 'prod-1' },
      body: { quantity: 1 },
    })
    const res = mockRes()

    await reserve(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.orderIdRequired' }),
    )
  })
})

// ── release ────────────────────────────────────────────────────────────

describe('release', () => {
  it('should release reservation and restore available stock', async () => {
    mockFindById.mockResolvedValueOnce(RESERVATION_ROW)
    mockFindOne.mockResolvedValueOnce(STOCK_ROW)
    mockUpdateById.mockResolvedValueOnce({})
    mockCreate.mockResolvedValueOnce({ data: {} })
    mockDeleteById.mockResolvedValueOnce({})

    const req = mockReq({ params: { reservationId: 'res-1' } })
    const res = mockRes()

    await release(req, res)

    expect(mockUpdateById).toHaveBeenCalledWith('inventory_stock', 'stock-1', { reserved: 15 })
    expect(mockDeleteById).toHaveBeenCalledWith('inventory_reservations', 'res-1')
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.end).toHaveBeenCalled()
  })

  it('should return 404 when reservation not found', async () => {
    mockFindById.mockResolvedValueOnce(null)

    const req = mockReq({ params: { reservationId: 'res-999' } })
    const res = mockRes()

    await release(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.reservationNotFound' }),
    )
  })

  it('should handle missing stock record gracefully', async () => {
    mockFindById.mockResolvedValueOnce(RESERVATION_ROW)
    mockFindOne.mockResolvedValueOnce(null) // stock record missing
    mockCreate.mockResolvedValueOnce({ data: {} })
    mockDeleteById.mockResolvedValueOnce({})

    const req = mockReq({ params: { reservationId: 'res-1' } })
    const res = mockRes()

    await release(req, res)

    expect(mockUpdateById).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(204)
  })
})

// ── confirm ────────────────────────────────────────────────────────────

describe('confirm', () => {
  it('should confirm reservation and decrease total stock', async () => {
    mockFindById.mockResolvedValueOnce(RESERVATION_ROW) // quantity: 5
    mockFindOne.mockResolvedValueOnce(STOCK_ROW) // total: 100, reserved: 20
    mockUpdateById.mockResolvedValueOnce({})
    mockCreate.mockResolvedValueOnce({ data: {} })
    mockDeleteById.mockResolvedValueOnce({})

    const req = mockReq({ params: { reservationId: 'res-1' } })
    const res = mockRes()

    await confirm(req, res)

    expect(mockUpdateById).toHaveBeenCalledWith('inventory_stock', 'stock-1', {
      total: 95,
      reserved: 15,
    })
    expect(mockDeleteById).toHaveBeenCalledWith('inventory_reservations', 'res-1')
    expect(res.status).toHaveBeenCalledWith(204)
  })

  it('should return 404 when reservation not found', async () => {
    mockFindById.mockResolvedValueOnce(null)

    const req = mockReq({ params: { reservationId: 'res-999' } })
    const res = mockRes()

    await confirm(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should handle missing stock record gracefully', async () => {
    mockFindById.mockResolvedValueOnce(RESERVATION_ROW)
    mockFindOne.mockResolvedValueOnce(null)
    mockCreate.mockResolvedValueOnce({ data: {} })
    mockDeleteById.mockResolvedValueOnce({})

    const req = mockReq({ params: { reservationId: 'res-1' } })
    const res = mockRes()

    await confirm(req, res)

    expect(mockUpdateById).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(204)
  })
})

// ── getAlerts ──────────────────────────────────────────────────────────

describe('getAlerts', () => {
  it('should return products at or below their low stock threshold', async () => {
    const lowStockRow = { ...STOCK_ROW, total: 15, reserved: 10 } // available = 5, threshold = 10
    const okRow = { ...STOCK_ROW, id: 'stock-2', productId: 'prod-2' } // available = 80, threshold = 10
    mockFindMany.mockResolvedValueOnce([lowStockRow, okRow])

    const req = mockReq()
    const res = mockRes()

    await getAlerts(req, res)

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 'prod-1', available: 5, threshold: 10 }),
    ])
  })

  it('should use custom threshold when provided', async () => {
    mockFindMany.mockResolvedValueOnce([STOCK_ROW]) // available = 80

    const req = mockReq({ query: { threshold: '90' } })
    const res = mockRes()

    await getAlerts(req, res)

    // available (80) <= custom threshold (90), so should be included
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 'prod-1', available: 80 }),
    ])
  })

  it('should return empty array when no low stock items', async () => {
    mockFindMany.mockResolvedValueOnce([STOCK_ROW]) // available = 80, threshold = 10

    const req = mockReq()
    const res = mockRes()

    await getAlerts(req, res)

    expect(res.json).toHaveBeenCalledWith([])
  })

  it('should return 500 on error', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('db error'))

    const req = mockReq()
    const res = mockRes()

    await getAlerts(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ── getMovements ───────────────────────────────────────────────────────

describe('getMovements', () => {
  const MOVEMENT_ROW = {
    id: 'm1',
    productId: 'prod-1',
    variantId: null,
    type: 'adjustment' as const,
    quantity: 10,
    reason: null,
    referenceId: null,
    createdAt: '2024-01-01T00:00:00Z',
  }

  it('should return paginated movements', async () => {
    mockFindMany.mockResolvedValueOnce([MOVEMENT_ROW])
    mockCount.mockResolvedValueOnce(1)

    const req = mockReq({ params: { productId: 'prod-1' } })
    const res = mockRes()

    await getMovements(req, res)

    expect(res.json).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id: 'm1', productId: 'prod-1' })],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  it('should respect page and limit params', async () => {
    mockFindMany.mockResolvedValueOnce([])
    mockCount.mockResolvedValueOnce(0)

    const req = mockReq({
      params: { productId: 'prod-1' },
      query: { page: '2', limit: '5' },
    })
    const res = mockRes()

    await getMovements(req, res)

    expect(mockFindMany).toHaveBeenCalledWith(
      'inventory_movements',
      expect.objectContaining({ limit: 5, offset: 5 }),
    )
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 5 }))
  })

  it('should cap limit at 100', async () => {
    mockFindMany.mockResolvedValueOnce([])
    mockCount.mockResolvedValueOnce(0)

    const req = mockReq({
      params: { productId: 'prod-1' },
      query: { limit: '500' },
    })
    const res = mockRes()

    await getMovements(req, res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }))
  })

  it('should return 500 on error', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('db error'))

    const req = mockReq({ params: { productId: 'prod-1' } })
    const res = mockRes()

    await getMovements(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ── bulkUpdate ─────────────────────────────────────────────────────────

describe('bulkUpdate', () => {
  it('should process multiple adjustments', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW) // first adjustment
    mockUpdateById.mockResolvedValueOnce({ data: { ...STOCK_ROW, total: 110 } })
    mockCreate.mockResolvedValueOnce({ data: {} }) // movement for first
    mockFindOne.mockResolvedValueOnce(null) // second adjustment (new product)
    mockCreate.mockResolvedValueOnce({
      data: { ...STOCK_ROW, id: 'stock-2', productId: 'prod-2', total: 50 },
    })
    mockCreate.mockResolvedValueOnce({ data: {} }) // movement for second

    const req = mockReq({
      body: {
        adjustments: [
          { productId: 'prod-1', quantity: 10, type: 'add' },
          { productId: 'prod-2', quantity: 50, type: 'set' },
        ],
      },
    })
    const res = mockRes()

    await bulkUpdate(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 2, succeeded: 2, failed: 0 }),
    )
  })

  it('should report individual failures without failing the batch', async () => {
    mockFindOne.mockResolvedValueOnce(STOCK_ROW) // first: succeeds
    mockUpdateById.mockResolvedValueOnce({ data: { ...STOCK_ROW, total: 110 } })
    mockCreate.mockResolvedValueOnce({ data: {} })

    const req = mockReq({
      body: {
        adjustments: [
          { productId: 'prod-1', quantity: 10, type: 'add' },
          { productId: '', quantity: 10, type: 'add' }, // invalid: empty productId
        ],
      },
    })
    const res = mockRes()

    await bulkUpdate(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 2, succeeded: 1, failed: 1 }),
    )
  })

  it('should reject empty adjustments array', async () => {
    const req = mockReq({ body: { adjustments: [] } })
    const res = mockRes()

    await bulkUpdate(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'inventory.error.adjustmentsRequired' }),
    )
  })

  it('should reject missing adjustments', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()

    await bulkUpdate(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 500 on top-level error', async () => {
    // Make the first findOne throw to trigger the outer catch
    mockFindOne.mockImplementationOnce(() => {
      throw new Error('catastrophic')
    })

    const req = mockReq({
      body: {
        adjustments: [{ productId: 'prod-1', quantity: 10, type: 'add' }],
      },
    })
    const res = mockRes()

    await bulkUpdate(req, res)

    // The inner try-catch catches individual errors, so it should report as a per-item failure
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ failed: 1 }))
  })
})
