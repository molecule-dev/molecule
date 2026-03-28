const { mockCreate, mockFindOne, mockFindMany, mockFindById, mockUpdateById, mockDeleteById } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindById: vi.fn(),
    mockUpdateById: vi.fn(),
    mockDeleteById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
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

import { addItem } from '../handlers/addItem.js'
import { applyCoupon } from '../handlers/applyCoupon.js'
import { clearCart } from '../handlers/clearCart.js'
import { getCart } from '../handlers/getCart.js'
import { getCartSummary } from '../handlers/getCartSummary.js'
import { removeCoupon } from '../handlers/removeCoupon.js'
import { removeItem } from '../handlers/removeItem.js'
import { updateQuantity } from '../handlers/updateQuantity.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

const CART_ROW = {
  id: 'cart-1',
  userId: 'user-1',
  coupon: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const ITEM_ROW = {
  id: 'item-1',
  cartId: 'cart-1',
  productId: 'prod-1',
  variantId: null,
  name: 'Widget',
  price: 10,
  quantity: 2,
  image: null,
  metadata: null,
  createdAt: '2024-01-01T00:00:00Z',
}

describe('@molecule/api-resource-cart handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCart', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await getCart(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should create a new cart if none exists and return empty cart', async () => {
      mockFindOne.mockResolvedValueOnce(null) // no cart
      mockCreate.mockResolvedValueOnce({ data: CART_ROW })
      mockFindMany.mockResolvedValueOnce([]) // no items

      const req = mockReq()
      const res = mockRes()

      await getCart(req, res)

      expect(mockCreate).toHaveBeenCalledWith('carts', { userId: 'user-1' })
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cart-1',
          items: [],
          subtotal: 0,
          total: 0,
        }),
      )
    })

    it('should return existing cart with items', async () => {
      mockFindOne.mockResolvedValueOnce(CART_ROW)
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq()
      const res = mockRes()

      await getCart(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cart-1',
          items: [expect.objectContaining({ productId: 'prod-1', quantity: 2 })],
          subtotal: 20,
          total: 20,
        }),
      )
    })

    it('should return 500 on database error', async () => {
      mockFindOne.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await getCart(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('addItem', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ body: { productId: 'p1', name: 'X', price: 5, quantity: 1 } })
      const res = mockRes({ locals: {} })

      await addItem(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when required fields are missing', async () => {
      const req = mockReq({ body: { productId: 'p1' } })
      const res = mockRes()

      await addItem(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'cart.error.itemRequired' }),
      )
    })

    it('should return 400 when quantity is zero', async () => {
      const req = mockReq({
        body: { productId: 'p1', name: 'X', price: 5, quantity: 0 },
      })
      const res = mockRes()

      await addItem(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when quantity is negative', async () => {
      const req = mockReq({
        body: { productId: 'p1', name: 'X', price: 5, quantity: -1 },
      })
      const res = mockRes()

      await addItem(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'cart.error.invalidQuantity' }),
      )
    })

    it('should add a new item to the cart', async () => {
      mockFindOne
        .mockResolvedValueOnce(CART_ROW) // find cart
        .mockResolvedValueOnce(null) // no existing item
        .mockResolvedValueOnce({ ...CART_ROW, updatedAt: '2024-01-02T00:00:00Z' }) // re-read cart
      mockCreate.mockResolvedValueOnce({ data: { id: 'item-2' } })
      mockUpdateById.mockResolvedValueOnce({})
      mockFindMany.mockResolvedValueOnce([
        { ...ITEM_ROW, id: 'item-2', productId: 'p2', name: 'Gadget', price: 15, quantity: 1 },
      ])

      const req = mockReq({
        body: { productId: 'p2', name: 'Gadget', price: 15, quantity: 1 },
      })
      const res = mockRes()

      await addItem(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCreate).toHaveBeenCalledWith(
        'cart_items',
        expect.objectContaining({ productId: 'p2', name: 'Gadget', price: 15 }),
      )
    })

    it('should increment quantity for existing product+variant', async () => {
      mockFindOne
        .mockResolvedValueOnce(CART_ROW) // find cart
        .mockResolvedValueOnce(ITEM_ROW) // existing item found
        .mockResolvedValueOnce(CART_ROW) // re-read cart
      mockUpdateById.mockResolvedValue({})
      mockFindMany.mockResolvedValueOnce([{ ...ITEM_ROW, quantity: 5 }])

      const req = mockReq({
        body: { productId: 'prod-1', name: 'Widget', price: 10, quantity: 3 },
      })
      const res = mockRes()

      await addItem(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith('cart_items', 'item-1', { quantity: 5 })
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('should create cart if none exists', async () => {
      mockFindOne
        .mockResolvedValueOnce(null) // no cart
        .mockResolvedValueOnce(null) // no existing item
        .mockResolvedValueOnce(CART_ROW) // re-read
      mockCreate
        .mockResolvedValueOnce({ data: CART_ROW }) // create cart
        .mockResolvedValueOnce({ data: { id: 'item-1' } }) // create item
      mockUpdateById.mockResolvedValueOnce({})
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq({
        body: { productId: 'prod-1', name: 'Widget', price: 10, quantity: 2 },
      })
      const res = mockRes()

      await addItem(req, res)

      expect(mockCreate).toHaveBeenCalledWith('carts', { userId: 'user-1' })
      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateQuantity', () => {
    it('should return 400 when quantity is missing', async () => {
      const req = mockReq({ params: { itemId: 'item-1' }, body: {} })
      const res = mockRes()

      await updateQuantity(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when cart not found', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      const req = mockReq({ params: { itemId: 'item-1' }, body: { quantity: 3 } })
      const res = mockRes()

      await updateQuantity(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'cart.error.notFound' }),
      )
    })

    it('should return 404 when item not found in cart', async () => {
      mockFindOne.mockResolvedValueOnce(CART_ROW)
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { itemId: 'missing' }, body: { quantity: 3 } })
      const res = mockRes()

      await updateQuantity(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'cart.error.itemNotFound' }),
      )
    })

    it('should return 404 when item belongs to different cart', async () => {
      mockFindOne.mockResolvedValueOnce(CART_ROW)
      mockFindById.mockResolvedValueOnce({ ...ITEM_ROW, cartId: 'other-cart' })

      const req = mockReq({ params: { itemId: 'item-1' }, body: { quantity: 3 } })
      const res = mockRes()

      await updateQuantity(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update item quantity and return updated cart', async () => {
      mockFindOne
        .mockResolvedValueOnce(CART_ROW) // find cart
        .mockResolvedValueOnce(CART_ROW) // re-read cart
      mockFindById.mockResolvedValueOnce(ITEM_ROW)
      mockUpdateById.mockResolvedValue({})
      mockFindMany.mockResolvedValueOnce([{ ...ITEM_ROW, quantity: 5 }])

      const req = mockReq({ params: { itemId: 'item-1' }, body: { quantity: 5 } })
      const res = mockRes()

      await updateQuantity(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith('cart_items', 'item-1', { quantity: 5 })
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ subtotal: 50 }))
    })
  })

  describe('removeItem', () => {
    it('should return 404 when cart not found', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      const req = mockReq({ params: { itemId: 'item-1' } })
      const res = mockRes()

      await removeItem(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 404 when item not found', async () => {
      mockFindOne.mockResolvedValueOnce(CART_ROW)
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { itemId: 'missing' } })
      const res = mockRes()

      await removeItem(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should remove item and return updated cart', async () => {
      mockFindOne
        .mockResolvedValueOnce(CART_ROW) // find cart
        .mockResolvedValueOnce(CART_ROW) // re-read
      mockFindById.mockResolvedValueOnce(ITEM_ROW)
      mockDeleteById.mockResolvedValueOnce({})
      mockUpdateById.mockResolvedValueOnce({})
      mockFindMany.mockResolvedValueOnce([]) // no items left

      const req = mockReq({ params: { itemId: 'item-1' } })
      const res = mockRes()

      await removeItem(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('cart_items', 'item-1')
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ items: [], subtotal: 0, total: 0 }),
      )
    })
  })

  describe('clearCart', () => {
    it('should return 204 when no cart exists', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      const req = mockReq()
      const res = mockRes()

      await clearCart(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('should delete all items and clear coupon', async () => {
      mockFindOne.mockResolvedValueOnce(CART_ROW)
      mockFindMany.mockResolvedValueOnce([ITEM_ROW, { ...ITEM_ROW, id: 'item-2' }])
      mockDeleteById.mockResolvedValue({})
      mockUpdateById.mockResolvedValueOnce({})

      const req = mockReq()
      const res = mockRes()

      await clearCart(req, res)

      expect(mockDeleteById).toHaveBeenCalledTimes(2)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'carts',
        'cart-1',
        expect.objectContaining({ coupon: null }),
      )
      expect(res.status).toHaveBeenCalledWith(204)
    })
  })

  describe('applyCoupon', () => {
    it('should return 400 when code is missing', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()

      await applyCoupon(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when coupon not found', async () => {
      mockFindOne.mockResolvedValueOnce(null) // coupon lookup

      const req = mockReq({ body: { code: 'INVALID' } })
      const res = mockRes()

      await applyCoupon(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'cart.error.couponNotFound' }),
      )
    })

    it('should apply coupon and return updated cart', async () => {
      const couponRecord = { id: 'c1', code: 'SAVE10', type: 'percentage', value: 10, active: true }
      mockFindOne
        .mockResolvedValueOnce(couponRecord) // coupon lookup
        .mockResolvedValueOnce(CART_ROW) // find cart
        .mockResolvedValueOnce({
          ...CART_ROW,
          coupon: JSON.stringify({ code: 'SAVE10', type: 'percentage', value: 10 }),
        }) // re-read
      mockUpdateById.mockResolvedValueOnce({})
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq({ body: { code: 'SAVE10' } })
      const res = mockRes()

      await applyCoupon(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'carts',
        'cart-1',
        expect.objectContaining({
          coupon: JSON.stringify({ code: 'SAVE10', type: 'percentage', value: 10 }),
        }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          coupon: { code: 'SAVE10', type: 'percentage', value: 10 },
          discount: 2,
        }),
      )
    })
  })

  describe('removeCoupon', () => {
    it('should return 404 when cart not found', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      const req = mockReq()
      const res = mockRes()

      await removeCoupon(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should remove coupon and return updated cart', async () => {
      const cartWithCoupon = {
        ...CART_ROW,
        coupon: JSON.stringify({ code: 'SAVE10', type: 'percentage', value: 10 }),
      }
      mockFindOne
        .mockResolvedValueOnce(cartWithCoupon) // find cart
        .mockResolvedValueOnce({ ...CART_ROW, coupon: null }) // re-read
      mockUpdateById.mockResolvedValueOnce({})
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq()
      const res = mockRes()

      await removeCoupon(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'carts',
        'cart-1',
        expect.objectContaining({ coupon: null }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ coupon: undefined, discount: 0 }),
      )
    })
  })

  describe('getCartSummary', () => {
    it('should return empty summary when no cart exists', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      const req = mockReq()
      const res = mockRes()

      await getCartSummary(req, res)

      expect(res.json).toHaveBeenCalledWith({
        itemCount: 0,
        uniqueItems: 0,
        subtotal: 0,
        total: 0,
      })
    })

    it('should return correct summary with items', async () => {
      mockFindOne.mockResolvedValueOnce(CART_ROW)
      mockFindMany.mockResolvedValueOnce([
        ITEM_ROW,
        { ...ITEM_ROW, id: 'item-2', productId: 'p2', name: 'Gadget', price: 5, quantity: 3 },
      ])

      const req = mockReq()
      const res = mockRes()

      await getCartSummary(req, res)

      expect(res.json).toHaveBeenCalledWith({
        itemCount: 5,
        uniqueItems: 2,
        subtotal: 35,
        total: 35,
      })
    })
  })
})
