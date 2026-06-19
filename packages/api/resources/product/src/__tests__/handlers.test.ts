const {
  mockCreate,
  mockFindOne,
  mockFindMany,
  mockFindById,
  mockUpdateById,
  mockHasProvider,
  mockCan,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdateById: vi.fn(),
  mockHasProvider: vi.fn(),
  mockCan: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-permissions', () => ({
  hasProvider: mockHasProvider,
  can: mockCan,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _values?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@molecule/api-locales-product', () => ({}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from '../handlers/create.js'
import { createVariant } from '../handlers/createVariant.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { listVariants } from '../handlers/listVariants.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

/** Session claim that satisfies the product admin gate without a permissions provider. */
const ADMIN_SESSION = { userId: 'admin-1', isAdmin: true }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    // Default to an admin session so the (now admin-gated) mutation handlers
    // exercise their happy path; non-admin / anonymous cases override `locals`.
    locals: { session: { ...ADMIN_SESSION } },
    ...overrides,
  }
  return res
}

describe('@molecule/api-resource-product handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fail-closed defaults: no permissions provider, deny.
    mockHasProvider.mockReturnValue(false)
    mockCan.mockResolvedValue(false)
  })

  describe('create', () => {
    it('should return 400 when name is missing', async () => {
      const req = mockReq({ body: { price: 1000 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.nameRequired' }),
      )
    })

    it('should return 400 when name is blank', async () => {
      const req = mockReq({ body: { name: '   ', price: 1000 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.nameRequired' }),
      )
    })

    it('should return 400 when price is missing', async () => {
      const req = mockReq({ body: { name: 'Widget' } })
      const res = mockRes()

      mockFindOne.mockResolvedValue(null)
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.invalidPrice' }),
      )
    })

    it('should return 400 when price is negative', async () => {
      const req = mockReq({ body: { name: 'Widget', price: -5 } })
      const res = mockRes()

      mockFindOne.mockResolvedValue(null)
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.invalidPrice' }),
      )
    })

    it('should return 400 when name produces empty slug', async () => {
      const req = mockReq({ body: { name: '!!!', price: 1000 } })
      const res = mockRes()

      mockFindOne.mockResolvedValue(null)
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.invalidName' }),
      )
    })

    it('should create product with slugified name', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        data: { id: '1', name: 'Cool Widget', slug: 'cool-widget', price: 1999 },
      })

      const req = mockReq({ body: { name: 'Cool Widget!', price: 1999 } })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          name: 'Cool Widget!',
          slug: 'cool-widget',
          price: 1999,
          currency: 'USD',
          status: 'draft',
          description: null,
          imageUrl: null,
          sku: null,
          inventory: null,
        }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('should append timestamp suffix on slug collision', async () => {
      mockFindOne.mockResolvedValue({ id: 'existing', slug: 'widget' })
      mockCreate.mockResolvedValue({ data: { id: '2', slug: 'widget-abc' } })

      const req = mockReq({ body: { name: 'Widget', price: 500 } })
      const res = mockRes()

      await create(req, res)

      const createdSlug = mockCreate.mock.calls[0][1].slug as string
      expect(createdSlug).toMatch(/^widget-[a-z0-9]+$/)
    })

    it('should accept optional fields', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        body: {
          name: 'Deluxe',
          price: 4999,
          currency: 'EUR',
          status: 'active',
          description: 'A fine product',
          imageUrl: 'https://example.com/img.jpg',
          sku: 'DLX-001',
          inventory: 100,
        },
      })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          currency: 'EUR',
          status: 'active',
          description: 'A fine product',
          imageUrl: 'https://example.com/img.jpg',
          sku: 'DLX-001',
          inventory: 100,
        }),
      )
    })

    it('should return 500 on database error', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ body: { name: 'Test', price: 100 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.createFailed' }),
      )
    })
  })

  describe('read', () => {
    it('should return product by id', async () => {
      const product = { id: '1', name: 'Widget', slug: 'widget', deletedAt: null }
      mockFindById.mockResolvedValue(product)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(product)
    })

    it('should return 404 when product not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.notFound' }),
      )
    })

    it('should return 404 for soft-deleted product', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.readFailed' }),
      )
    })
  })

  describe('list', () => {
    it('should return paginated products excluding soft-deleted', async () => {
      const products = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]
      mockFindMany.mockResolvedValue(products)

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('products', {
        where: [{ field: 'deletedAt', operator: 'is_null' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
      expect(res.json).toHaveBeenCalledWith({ data: products, page: 1, perPage: 20 })
    })

    it('should respect page and perPage query params', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ query: { page: '3', perPage: '10' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('products', {
        where: [{ field: 'deletedAt', operator: 'is_null' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
        offset: 20,
      })
      expect(res.json).toHaveBeenCalledWith({ data: [], page: 3, perPage: 10 })
    })

    it('should cap perPage at 100', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ query: { perPage: '500' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('products', expect.objectContaining({ limit: 100 }))
    })

    it('should filter by status when provided', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ query: { status: 'active' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('products', {
        where: [
          { field: 'deletedAt', operator: 'is_null' },
          { field: 'status', operator: '=', value: 'active' },
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
    })

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.listFailed' }),
      )
    })
  })

  describe('update', () => {
    it('should return 401 when there is no session (unauthenticated)', async () => {
      const req = mockReq({ params: { id: '1' }, body: { price: 1 } })
      const res = mockRes({ locals: {} })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('should return 403 for an authenticated non-admin user (price/stock edit blocked)', async () => {
      const req = mockReq({ params: { id: '1' }, body: { price: 1, inventory: 9999 } })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.forbidden' }),
      )
      // Fail-closed: no read or write attempted for a non-admin.
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('should allow a non-claim user when the permissions provider grants manage product', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(true)
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: { id: '1', price: 500 } })

      const req = mockReq({ params: { id: '1' }, body: { price: 500 } })
      const res = mockRes({ locals: { session: { userId: 'merchant-1' } } })

      await update(req, res)

      expect(mockCan).toHaveBeenCalledWith('user:merchant-1', 'manage', 'product')
      expect(mockUpdateById).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ id: '1', price: 500 })
    })

    it('should return 404 when product not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' }, body: { name: 'New' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 for soft-deleted product', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' }, body: { name: 'New' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update only provided fields', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: { id: '1', name: 'Updated' } })

      const req = mockReq({ params: { id: '1' }, body: { name: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.name).toBe('Updated')
      expect(updateData.updatedAt).toBeDefined()
      expect(updateData.description).toBeUndefined()
      expect(updateData.price).toBeUndefined()
    })

    it('should update multiple fields', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        params: { id: '1' },
        body: { price: 2999, status: 'active', sku: 'NEW-SKU', inventory: 50 },
      })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.price).toBe(2999)
      expect(updateData.status).toBe('active')
      expect(updateData.sku).toBe('NEW-SKU')
      expect(updateData.inventory).toBe(50)
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockUpdateById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' }, body: { name: 'Test' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.updateFailed' }),
      )
    })
  })

  describe('del', () => {
    it('should return 401 when there is no session (unauthenticated)', async () => {
      const req = mockReq({ params: { id: '1' } })
      const res = mockRes({ locals: {} })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('should return 403 for an authenticated non-admin user (product delete blocked)', async () => {
      const req = mockReq({ params: { id: '1' } })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.forbidden' }),
      )
      // Fail-closed: no read or delete attempted for a non-admin.
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('should return 404 when product not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 for already soft-deleted product', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should soft-delete product and return 204', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'products',
        '1',
        expect.objectContaining({
          deletedAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      )
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockUpdateById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.deleteFailed' }),
      )
    })
  })

  describe('listVariants', () => {
    it('should return 404 when product not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await listVariants(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 for soft-deleted product', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listVariants(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return variants for a valid product', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      const variants = [
        { id: 'v1', productId: '1', name: 'Small' },
        { id: 'v2', productId: '1', name: 'Large' },
      ]
      mockFindMany.mockResolvedValue(variants)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listVariants(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('product_variants', {
        where: [{ field: 'productId', operator: '=', value: '1' }],
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
      })
      expect(res.json).toHaveBeenCalledWith(variants)
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listVariants(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.listVariantsFailed' }),
      )
    })
  })

  describe('createVariant', () => {
    it('should return 401 when there is no session (unauthenticated)', async () => {
      const req = mockReq({ params: { id: '1' }, body: { name: 'Small' } })
      const res = mockRes({ locals: {} })

      await createVariant(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should return 403 for an authenticated non-admin user (variant create blocked)', async () => {
      const req = mockReq({ params: { id: '1' }, body: { name: 'Small', price: 1 } })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await createVariant(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.forbidden' }),
      )
      // Fail-closed: no read or write attempted for a non-admin.
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should return 404 when product not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' }, body: { name: 'Small' } })
      const res = mockRes()

      await createVariant(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 for soft-deleted product', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' }, body: { name: 'Small' } })
      const res = mockRes()

      await createVariant(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 400 when variant name is missing', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })

      const req = mockReq({ params: { id: '1' }, body: {} })
      const res = mockRes()

      await createVariant(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.variantNameRequired' }),
      )
    })

    it('should return 400 when variant name is blank', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })

      const req = mockReq({ params: { id: '1' }, body: { name: '   ' } })
      const res = mockRes()

      await createVariant(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.variantNameRequired' }),
      )
    })

    it('should create variant with defaults', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      const created = { id: 'v1', productId: '1', name: 'Small' }
      mockCreate.mockResolvedValue({ data: created })

      const req = mockReq({ params: { id: '1' }, body: { name: 'Small' } })
      const res = mockRes()

      await createVariant(req, res)

      expect(mockCreate).toHaveBeenCalledWith('product_variants', {
        productId: '1',
        name: 'Small',
        sku: null,
        price: null,
        inventory: null,
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(created)
    })

    it('should accept optional variant fields', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockCreate.mockResolvedValue({ data: { id: 'v1' } })

      const req = mockReq({
        params: { id: '1' },
        body: { name: 'Large', sku: 'LRG-001', price: 2999, inventory: 25 },
      })
      const res = mockRes()

      await createVariant(req, res)

      expect(mockCreate).toHaveBeenCalledWith('product_variants', {
        productId: '1',
        name: 'Large',
        sku: 'LRG-001',
        price: 2999,
        inventory: 25,
      })
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null })
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' }, body: { name: 'Small' } })
      const res = mockRes()

      await createVariant(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'product.error.createVariantFailed' }),
      )
    })
  })
})
