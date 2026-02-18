/**
 * Tests for the paymentRecordService (PaymentRecordService bond implementation).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreate, mockFindOne, mockFindMany, mockDeleteMany, mockQuery, mockLogger } = vi.hoisted(
  () => ({
    mockCreate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindMany: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockQuery: vi.fn(),
    mockLogger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    },
  }),
)

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  deleteMany: mockDeleteMany,
  query: mockQuery,
}))

vi.mock('@molecule/api-bond', () => ({
  getAnalytics: () => ({
    identify: vi.fn().mockResolvedValue(undefined),
    track: vi.fn().mockResolvedValue(undefined),
    page: vi.fn().mockResolvedValue(undefined),
  }),
  getLogger: () => mockLogger,
  get: vi.fn(),
  set: vi.fn(),
  getAll: vi.fn(),
}))

import { paymentRecordService } from '../recordService.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('paymentRecordService.store', () => {
  const record = {
    userId: 'user-123',
    platformKey: 'stripe',
    transactionId: 'txn_456',
    productId: 'price_test_id',
    data: { customerId: 'cus_789' },
    receipt: 'receipt_data',
  }

  it('should insert a payment record with all fields', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    await paymentRecordService.store(record)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const [tableName, data] = mockCreate.mock.calls[0]
    expect(tableName).toBe('payments')
    expect(data).toEqual({
      userId: 'user-123',
      platformKey: 'stripe',
      transactionId: 'txn_456',
      productId: 'price_test_id',
      data: JSON.stringify({ customerId: 'cus_789' }),
      receipt: 'receipt_data',
    })
  })

  it('should handle duplicate records via try/catch', async () => {
    mockCreate.mockRejectedValueOnce(new Error('duplicate key'))

    await paymentRecordService.store(record)

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to store payment record:',
      expect.any(Error),
    )
  })

  it('should handle null receipt', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    await paymentRecordService.store({
      ...record,
      receipt: undefined,
    })

    const [, data] = mockCreate.mock.calls[0]
    expect(data.receipt).toBeNull()
  })

  it('should stringify data as JSON', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    const complexData = { nested: { deep: true }, list: [1, 2, 3] }
    await paymentRecordService.store({ ...record, data: complexData })

    const [, data] = mockCreate.mock.calls[0]
    expect(data.data).toBe(JSON.stringify(complexData))
  })

  it('should stringify empty data as empty JSON object', async () => {
    mockCreate.mockResolvedValueOnce({ affected: 1 })

    await paymentRecordService.store({ ...record, data: undefined })

    const [, data] = mockCreate.mock.calls[0]
    expect(data.data).toBe('{}')
  })

  it('should log error on database failure', async () => {
    const dbError = new Error('Connection failed')
    mockCreate.mockRejectedValueOnce(dbError)

    await paymentRecordService.store(record)

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to store payment record:', dbError)
  })

  it('should not throw on database failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Connection failed'))

    await expect(paymentRecordService.store(record)).resolves.toBeUndefined()
  })
})

describe('paymentRecordService.findByTransaction', () => {
  it('should find a record by transactionId and platformKey', async () => {
    const mockRow = { userId: 'user-123' }
    mockFindOne.mockResolvedValueOnce(mockRow)

    const result = await paymentRecordService.findByTransaction('stripe', 'txn_456')

    expect(result).toEqual({ userId: 'user-123' })
    expect(mockFindOne).toHaveBeenCalledTimes(1)
    expect(mockFindOne).toHaveBeenCalledWith('payments', [
      { field: 'transactionId', operator: '=', value: 'txn_456' },
      { field: 'platformKey', operator: '=', value: 'stripe' },
    ])
  })

  it('should return null when no record found', async () => {
    mockFindOne.mockResolvedValueOnce(null)

    const result = await paymentRecordService.findByTransaction('stripe', 'nonexistent')

    expect(result).toBeNull()
  })

  it('should log error on database failure', async () => {
    const dbError = new Error('Query failed')
    mockFindOne.mockRejectedValueOnce(dbError)

    const result = await paymentRecordService.findByTransaction('stripe', 'txn_456')

    expect(result).toBeNull()
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to find payment by transaction:', dbError)
  })
})

describe('paymentRecordService.findByCustomerData', () => {
  it('should find a record by customer data key/value using raw query', async () => {
    const mockRow = { userId: 'user-123' }
    mockQuery.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 })

    const result = await paymentRecordService.findByCustomerData('stripe', 'customerId', 'cus_789')

    expect(result).toEqual({ userId: 'user-123' })
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('"platformKey"')
    expect(sql).toContain('"data"')
    expect(sql).toContain('LIMIT 1')
    expect(params).toEqual(['stripe', 'customerId', 'cus_789'])
  })

  it('should return null when no record found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const result = await paymentRecordService.findByCustomerData(
      'stripe',
      'customerId',
      'nonexistent',
    )

    expect(result).toBeNull()
  })

  it('should return null when result is undefined', async () => {
    mockQuery.mockResolvedValueOnce(undefined)

    const result = await paymentRecordService.findByCustomerData('stripe', 'customerId', 'cus_789')

    expect(result).toBeNull()
  })

  it('should log error on database failure', async () => {
    const dbError = new Error('Query failed')
    mockQuery.mockRejectedValueOnce(dbError)

    const result = await paymentRecordService.findByCustomerData('stripe', 'customerId', 'cus_789')

    expect(result).toBeNull()
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to find payment by customer data:',
      dbError,
    )
  })
})

describe('paymentRecordService.findByUserId', () => {
  it('should find the most recent record by userId and platformKey', async () => {
    const mockRow = { data: { customerId: 'cus_789' }, transactionId: 'txn_456' }
    mockFindMany.mockResolvedValueOnce([mockRow])

    const result = await paymentRecordService.findByUserId('user-123', 'stripe')

    expect(result).toEqual(mockRow)
    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith('payments', {
      where: [
        { field: 'userId', operator: '=', value: 'user-123' },
        { field: 'platformKey', operator: '=', value: 'stripe' },
      ],
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      limit: 1,
    })
  })

  it('should return null when no record found', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const result = await paymentRecordService.findByUserId('user-123', 'stripe')

    expect(result).toBeNull()
  })

  it('should log error on database failure', async () => {
    const dbError = new Error('Query failed')
    mockFindMany.mockRejectedValueOnce(dbError)

    const result = await paymentRecordService.findByUserId('user-123', 'stripe')

    expect(result).toBeNull()
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to find payment by userId:', dbError)
  })
})

describe('paymentRecordService.deleteByUserId', () => {
  it('should delete all records for a userId', async () => {
    mockDeleteMany.mockResolvedValueOnce({ affected: 3 })

    await paymentRecordService.deleteByUserId('user-123')

    expect(mockDeleteMany).toHaveBeenCalledTimes(1)
    expect(mockDeleteMany).toHaveBeenCalledWith('payments', [
      { field: 'userId', operator: '=', value: 'user-123' },
    ])
  })

  it('should log error on database failure', async () => {
    const dbError = new Error('Delete failed')
    mockDeleteMany.mockRejectedValueOnce(dbError)

    await paymentRecordService.deleteByUserId('user-123')

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete payment records:', dbError)
  })

  it('should not throw on database failure', async () => {
    mockDeleteMany.mockRejectedValueOnce(new Error('Delete failed'))

    await expect(paymentRecordService.deleteByUserId('user-123')).resolves.toBeUndefined()
  })
})
