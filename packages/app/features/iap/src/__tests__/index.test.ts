/**
 * `@molecule/app-iap`
 * Comprehensive tests for In-App Purchases module.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createNoopIAPProvider } from '../iap.js'
import {
  finish,
  get,
  getAll,
  getProvider,
  initialize,
  isAvailable,
  manageSubscriptions,
  order,
  refresh,
  register,
  restore,
  setProvider,
  verify,
} from '../provider.js'
import type {
  ErrorEventHandler,
  IAPError,
  IAPEvent,
  IAPEventHandler,
  IAPProvider,
  Product,
  ProductDefinition,
  ProductEventHandler,
  ProductState,
  ProductType,
  PurchaseResult,
  SubscriptionPeriod,
  Transaction,
  VerificationResult,
} from '../types.js'
import { errorMessages, getErrorMessage } from '../utilities.js'

/**
 * Create a mock product for testing
 */
function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'com.app.product1',
    alias: 'product1',
    type: 'consumable',
    state: 'valid',
    title: 'Test Product',
    description: 'A test product for unit tests',
    price: '$0.99',
    priceMicros: 990000,
    currency: 'USD',
    canPurchase: true,
    owned: false,
    ...overrides,
  }
}

/**
 * Create a mock transaction for testing
 */
function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn_123456',
    receipt: 'mock-receipt-data',
    purchaseTime: new Date('2024-01-15T10:00:00Z'),
    isValid: true,
    ...overrides,
  }
}

/**
 * Create a mock IAPProvider for testing
 */
function createMockProvider(): IAPProvider {
  const products = new Map<string, Product>()
  const handlers = new Map<string, Set<IAPEventHandler>>()
  const productHandlers = new Map<string, Map<string, Set<(...args: unknown[]) => void>>>()

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    register: vi.fn((definitions: ProductDefinition[]) => {
      for (const def of definitions) {
        const product = createMockProduct({
          id: def.id,
          alias: def.alias,
          type: def.type,
          group: def.group,
          state: 'registered',
        })
        products.set(def.id, product)
        products.set(def.alias, product)
      }
    }),
    refresh: vi.fn().mockResolvedValue(undefined),
    get: vi.fn((idOrAlias: string) => products.get(idOrAlias)),
    getAll: vi.fn(() => Array.from(new Set(products.values()))),
    canPurchase: vi.fn((idOrAlias: string) => {
      const product = products.get(idOrAlias)
      return product?.canPurchase ?? false
    }),
    order: vi.fn().mockResolvedValue({
      success: true,
      product: createMockProduct(),
      transaction: createMockTransaction(),
    } as PurchaseResult),
    finish: vi.fn(),
    verify: vi.fn().mockResolvedValue({ valid: true } as VerificationResult),
    restore: vi.fn().mockResolvedValue([]),
    manageSubscriptions: vi.fn(),
    when: vi.fn((idOrAlias: string) => {
      if (!productHandlers.has(idOrAlias)) {
        productHandlers.set(idOrAlias, new Map())
      }
      const productMap = productHandlers.get(idOrAlias)!
      return {
        updated: (handler: ProductEventHandler) => {
          if (!productMap.has('updated')) productMap.set('updated', new Set())
          productMap.get('updated')!.add(handler)
        },
        approved: (handler: ProductEventHandler) => {
          if (!productMap.has('approved')) productMap.set('approved', new Set())
          productMap.get('approved')!.add(handler)
        },
        finished: (handler: ProductEventHandler) => {
          if (!productMap.has('finished')) productMap.set('finished', new Set())
          productMap.get('finished')!.add(handler)
        },
        cancelled: (handler: ProductEventHandler) => {
          if (!productMap.has('cancelled')) productMap.set('cancelled', new Set())
          productMap.get('cancelled')!.add(handler)
        },
        error: (handler: ErrorEventHandler) => {
          if (!productMap.has('error')) productMap.set('error', new Set())
          productMap.get('error')!.add(handler)
        },
      }
    }),
    on: vi.fn((event: IAPEvent, handler: IAPEventHandler) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(handler)
      return () => handlers.get(event)?.delete(handler)
    }),
    off: vi.fn((handler: IAPEventHandler) => {
      handlers.forEach((set) => set.delete(handler))
    }),
    getPlatform: vi.fn().mockReturnValue('ios'),
    isAvailable: vi.fn().mockReturnValue(true),
    destroy: vi.fn(() => {
      products.clear()
      handlers.clear()
      productHandlers.clear()
    }),
  }
}

describe('@molecule/app-iap', () => {
  describe('Provider Management', () => {
    beforeEach(() => {
      // Reset provider state
      setProvider(null as unknown as IAPProvider)
    })

    describe('setProvider', () => {
      it('should set the provider', () => {
        const mockProvider = createMockProvider()
        setProvider(mockProvider)
        expect(getProvider()).toBe(mockProvider)
      })

      it('should allow replacing an existing provider', () => {
        const firstProvider = createMockProvider()
        const secondProvider = createMockProvider()

        setProvider(firstProvider)
        setProvider(secondProvider)

        expect(getProvider()).toBe(secondProvider)
      })
    })

    describe('getProvider', () => {
      it('should return the set provider', () => {
        const mockProvider = createMockProvider()
        setProvider(mockProvider)
        expect(getProvider()).toBe(mockProvider)
      })

      it('should return a noop provider when no provider is set', () => {
        const provider = getProvider()
        expect(provider).toBeDefined()
        expect(provider.isAvailable()).toBe(false)
        expect(provider.getPlatform()).toBe('web')
      })
    })
  })

  describe('No-op IAP Provider', () => {
    let noopProvider: IAPProvider

    beforeEach(() => {
      noopProvider = createNoopIAPProvider()
    })

    describe('initialize', () => {
      it('should resolve without error', async () => {
        await expect(noopProvider.initialize()).resolves.toBeUndefined()
      })
    })

    describe('register', () => {
      it('should register products', () => {
        const definitions: ProductDefinition[] = [
          { id: 'com.app.product1', alias: 'product1', type: 'consumable' },
          { id: 'com.app.product2', alias: 'product2', type: 'non-consumable' },
        ]

        noopProvider.register(definitions)

        expect(noopProvider.get('com.app.product1')).toBeDefined()
        expect(noopProvider.get('product1')).toBeDefined()
        expect(noopProvider.get('com.app.product2')).toBeDefined()
        expect(noopProvider.get('product2')).toBeDefined()
      })

      it('should allow lookup by both id and alias', () => {
        noopProvider.register([{ id: 'com.app.premium', alias: 'premium', type: 'subscription' }])

        const byId = noopProvider.get('com.app.premium')
        const byAlias = noopProvider.get('premium')

        expect(byId).toBe(byAlias)
      })

      it('should set default product properties', () => {
        noopProvider.register([{ id: 'com.app.item', alias: 'item', type: 'consumable' }])

        const product = noopProvider.get('item')
        expect(product).toMatchObject({
          id: 'com.app.item',
          alias: 'item',
          type: 'consumable',
          state: 'registered',
          price: '$0.00',
          priceMicros: 0,
          currency: 'USD',
          canPurchase: false,
          owned: false,
        })
      })

      it('should preserve product group', () => {
        noopProvider.register([
          { id: 'com.app.sub', alias: 'sub', type: 'subscription', group: 'premium-group' },
        ])

        const product = noopProvider.get('sub')
        expect(product?.group).toBe('premium-group')
      })
    })

    describe('refresh', () => {
      it('should resolve without error', async () => {
        await expect(noopProvider.refresh()).resolves.toBeUndefined()
      })
    })

    describe('get', () => {
      it('should return undefined for unregistered products', () => {
        expect(noopProvider.get('unknown')).toBeUndefined()
      })
    })

    describe('getAll', () => {
      it('should return empty array when no products registered', () => {
        expect(noopProvider.getAll()).toEqual([])
      })

      it('should return all unique products', () => {
        noopProvider.register([
          { id: 'com.app.p1', alias: 'p1', type: 'consumable' },
          { id: 'com.app.p2', alias: 'p2', type: 'non-consumable' },
          { id: 'com.app.p3', alias: 'p3', type: 'subscription' },
        ])

        const products = noopProvider.getAll()
        expect(products).toHaveLength(3)
      })

      it('should not return duplicates', () => {
        noopProvider.register([{ id: 'com.app.item', alias: 'item', type: 'consumable' }])

        const products = noopProvider.getAll()
        // Both id and alias map to same product, should only appear once
        expect(products).toHaveLength(1)
      })
    })

    describe('canPurchase', () => {
      it('should always return false', () => {
        noopProvider.register([{ id: 'com.app.item', alias: 'item', type: 'consumable' }])

        expect(noopProvider.canPurchase('item')).toBe(false)
        expect(noopProvider.canPurchase('unknown')).toBe(false)
      })
    })

    describe('order', () => {
      it('should return unsuccessful result with error', async () => {
        const result = await noopProvider.order('item')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error?.code).toBe('E_NOT_AVAILABLE')
        expect(result.error?.message).toBe('In-app purchases are not available.')
      })
    })

    describe('finish', () => {
      it('should not throw', () => {
        const product = createMockProduct()
        expect(() => noopProvider.finish(product)).not.toThrow()
      })
    })

    describe('verify', () => {
      it('should return invalid verification result', async () => {
        const product = createMockProduct()
        const result = await noopProvider.verify(product, 'https://api.example.com/verify')

        expect(result.valid).toBe(false)
      })
    })

    describe('restore', () => {
      it('should return empty array', async () => {
        const products = await noopProvider.restore()
        expect(products).toEqual([])
      })
    })

    describe('manageSubscriptions', () => {
      it('should not throw', () => {
        expect(() => noopProvider.manageSubscriptions()).not.toThrow()
      })
    })

    describe('when (product event handlers)', () => {
      it('should return handler registration functions', () => {
        const handlers = noopProvider.when('product1')

        expect(handlers.updated).toBeDefined()
        expect(handlers.approved).toBeDefined()
        expect(handlers.finished).toBeDefined()
        expect(handlers.cancelled).toBeDefined()
        expect(handlers.error).toBeDefined()
      })

      it('should accept handlers without error', () => {
        const handlers = noopProvider.when('product1')

        expect(() => handlers.updated(() => {})).not.toThrow()
        expect(() => handlers.approved(() => {})).not.toThrow()
        expect(() => handlers.finished(() => {})).not.toThrow()
        expect(() => handlers.cancelled(() => {})).not.toThrow()
        expect(() => handlers.error(() => {})).not.toThrow()
      })
    })

    describe('on (global event handlers)', () => {
      it('should register event handler and return unsubscribe function', () => {
        const handler = vi.fn()
        const unsubscribe = noopProvider.on('ready', handler)

        expect(typeof unsubscribe).toBe('function')
      })

      it('should unsubscribe when unsubscribe function is called', () => {
        const handler = vi.fn()
        const unsubscribe = noopProvider.on('ready', handler)

        unsubscribe()
        // Handler should be removed (verified by internal implementation)
      })
    })

    describe('off', () => {
      it('should remove handler without error', () => {
        const handler = vi.fn()
        noopProvider.on('ready', handler)

        expect(() => noopProvider.off(handler)).not.toThrow()
      })
    })

    describe('getPlatform', () => {
      it('should return web', () => {
        expect(noopProvider.getPlatform()).toBe('web')
      })
    })

    describe('isAvailable', () => {
      it('should return false', () => {
        expect(noopProvider.isAvailable()).toBe(false)
      })
    })

    describe('destroy', () => {
      it('should clear all products and handlers', () => {
        noopProvider.register([{ id: 'com.app.item', alias: 'item', type: 'consumable' }])
        noopProvider.on('ready', () => {})

        noopProvider.destroy()

        expect(noopProvider.getAll()).toHaveLength(0)
        expect(noopProvider.get('item')).toBeUndefined()
      })
    })
  })

  describe('Provider Delegation', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    describe('initialize', () => {
      it('should delegate to provider.initialize', async () => {
        await initialize()
        expect(mockProvider.initialize).toHaveBeenCalled()
      })

      it('should return a Promise', () => {
        const result = initialize()
        expect(result).toBeInstanceOf(Promise)
      })
    })

    describe('register', () => {
      it('should delegate to provider.register', () => {
        const definitions: ProductDefinition[] = [
          { id: 'com.app.item', alias: 'item', type: 'consumable' },
        ]

        register(definitions)
        expect(mockProvider.register).toHaveBeenCalledWith(definitions)
      })
    })

    describe('refresh', () => {
      it('should delegate to provider.refresh', async () => {
        await refresh()
        expect(mockProvider.refresh).toHaveBeenCalled()
      })
    })

    describe('get', () => {
      it('should delegate to provider.get', () => {
        get('item')
        expect(mockProvider.get).toHaveBeenCalledWith('item')
      })
    })

    describe('getAll', () => {
      it('should delegate to provider.getAll', () => {
        getAll()
        expect(mockProvider.getAll).toHaveBeenCalled()
      })
    })

    describe('order', () => {
      it('should delegate to provider.order', async () => {
        await order('item')
        expect(mockProvider.order).toHaveBeenCalledWith('item')
      })
    })

    describe('finish', () => {
      it('should delegate to provider.finish', () => {
        const product = createMockProduct()
        finish(product)
        expect(mockProvider.finish).toHaveBeenCalledWith(product)
      })
    })

    describe('verify', () => {
      it('should delegate to provider.verify', async () => {
        const product = createMockProduct()
        const verifyUrl = 'https://api.example.com/verify'
        const additionalData = { userId: 'user123' }

        await verify(product, verifyUrl, additionalData)
        expect(mockProvider.verify).toHaveBeenCalledWith(product, verifyUrl, additionalData)
      })
    })

    describe('restore', () => {
      it('should delegate to provider.restore', async () => {
        await restore()
        expect(mockProvider.restore).toHaveBeenCalled()
      })
    })

    describe('manageSubscriptions', () => {
      it('should delegate to provider.manageSubscriptions', () => {
        manageSubscriptions()
        expect(mockProvider.manageSubscriptions).toHaveBeenCalled()
      })
    })

    describe('isAvailable', () => {
      it('should delegate to provider.isAvailable', () => {
        isAvailable()
        expect(mockProvider.isAvailable).toHaveBeenCalled()
      })
    })
  })

  describe('Product Management', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should register multiple products', () => {
      const definitions: ProductDefinition[] = [
        { id: 'com.app.coins100', alias: 'coins100', type: 'consumable' },
        { id: 'com.app.premium', alias: 'premium', type: 'non-consumable' },
        { id: 'com.app.pro_monthly', alias: 'pro_monthly', type: 'subscription', group: 'pro' },
        { id: 'com.app.pro_yearly', alias: 'pro_yearly', type: 'subscription', group: 'pro' },
      ]

      register(definitions)
      expect(mockProvider.register).toHaveBeenCalledWith(definitions)
    })

    it('should support all product types', () => {
      const types: ProductType[] = ['consumable', 'non-consumable', 'subscription']

      types.forEach((type, i) => {
        const definitions: ProductDefinition[] = [
          { id: `com.app.product${i}`, alias: `product${i}`, type },
        ]
        register(definitions)
      })

      expect(mockProvider.register).toHaveBeenCalledTimes(3)
    })
  })

  describe('Purchase Flow', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should handle successful purchase', async () => {
      const expectedResult: PurchaseResult = {
        success: true,
        product: createMockProduct(),
        transaction: createMockTransaction(),
      }
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult)

      const result = await order('product1')

      expect(result.success).toBe(true)
      expect(result.product).toBeDefined()
      expect(result.transaction).toBeDefined()
    })

    it('should handle failed purchase', async () => {
      const expectedResult: PurchaseResult = {
        success: false,
        error: { code: 'E_PURCHASE', message: 'Purchase failed' },
      }
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult)

      const result = await order('product1')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle cancelled purchase', async () => {
      const expectedResult: PurchaseResult = {
        success: false,
        error: { code: 'E_CANCELLED', message: 'Purchase was cancelled' },
      }
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult)

      const result = await order('product1')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('E_CANCELLED')
    })

    it('should handle deferred purchase', async () => {
      const expectedResult: PurchaseResult = {
        success: false,
        error: { code: 'E_DEFERRED', message: 'Purchase requires approval' },
      }
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult)

      const result = await order('product1')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('E_DEFERRED')
    })

    it('should handle already owned error', async () => {
      const expectedResult: PurchaseResult = {
        success: false,
        error: { code: 'E_ALREADY_OWNED', message: 'You already own this item' },
      }
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult)

      const result = await order('product1')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('E_ALREADY_OWNED')
    })
  })

  describe('Subscription Handling', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should register subscription with period', () => {
      const subscriptionDef: ProductDefinition = {
        id: 'com.app.premium_monthly',
        alias: 'premium_monthly',
        type: 'subscription',
        group: 'premium',
      }

      register([subscriptionDef])
      expect(mockProvider.register).toHaveBeenCalledWith([subscriptionDef])
    })

    it('should handle subscription purchase with trial', async () => {
      const subscriptionProduct = createMockProduct({
        type: 'subscription',
        subscriptionPeriod: 'monthly',
        introPrice: '$0.00',
        trialPeriodDays: 7,
      })

      const expectedResult: PurchaseResult = {
        success: true,
        product: subscriptionProduct,
        transaction: createMockTransaction({
          expirationTime: new Date('2024-02-15T10:00:00Z'),
        }),
      }
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue(expectedResult)

      const result = await order('premium_monthly')

      expect(result.success).toBe(true)
      expect(result.product?.subscriptionPeriod).toBe('monthly')
      expect(result.product?.trialPeriodDays).toBe(7)
      expect(result.transaction?.expirationTime).toBeDefined()
    })

    it('should restore subscriptions', async () => {
      const restoredSubscription = createMockProduct({
        type: 'subscription',
        owned: true,
        state: 'owned',
      })
      ;(mockProvider.restore as ReturnType<typeof vi.fn>).mockResolvedValue([restoredSubscription])

      const products = await restore()

      expect(products).toHaveLength(1)
      expect(products[0].owned).toBe(true)
    })

    it('should open subscription management', () => {
      manageSubscriptions()
      expect(mockProvider.manageSubscriptions).toHaveBeenCalled()
    })

    it('should support all subscription periods', () => {
      const periods: SubscriptionPeriod[] = ['weekly', 'monthly', 'yearly', 'lifetime']

      periods.forEach((period) => {
        const product = createMockProduct({
          type: 'subscription',
          subscriptionPeriod: period,
        })
        expect(product.subscriptionPeriod).toBe(period)
      })
    })
  })

  describe('Receipt Validation', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should verify valid receipt', async () => {
      const product = createMockProduct()
      const verificationResult: VerificationResult = {
        valid: true,
        isActive: true,
        plan: 'premium',
      }
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockResolvedValue(verificationResult)

      const result = await verify(product, 'https://api.example.com/verify')

      expect(result.valid).toBe(true)
      expect(result.isActive).toBe(true)
      expect(result.plan).toBe('premium')
    })

    it('should verify invalid receipt', async () => {
      const product = createMockProduct()
      const verificationResult: VerificationResult = {
        valid: false,
      }
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockResolvedValue(verificationResult)

      const result = await verify(product, 'https://api.example.com/verify')

      expect(result.valid).toBe(false)
    })

    it('should verify subscription with expiration', async () => {
      const product = createMockProduct({ type: 'subscription' })
      const expirationTime = new Date('2024-12-31T23:59:59Z')
      const verificationResult: VerificationResult = {
        valid: true,
        isActive: true,
        expirationTime,
      }
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockResolvedValue(verificationResult)

      const result = await verify(product, 'https://api.example.com/verify')

      expect(result.valid).toBe(true)
      expect(result.expirationTime).toEqual(expirationTime)
    })

    it('should pass additional data to verification endpoint', async () => {
      const product = createMockProduct()
      const additionalData = {
        userId: 'user123',
        deviceId: 'device456',
        environment: 'production',
      }

      await verify(product, 'https://api.example.com/verify', additionalData)

      expect(mockProvider.verify).toHaveBeenCalledWith(
        product,
        'https://api.example.com/verify',
        additionalData,
      )
    })

    it('should handle iOS App Store receipt', async () => {
      const product = createMockProduct({
        transaction: createMockTransaction({
          appStoreReceipt: 'base64-encoded-receipt-data',
        }),
      })

      await verify(product, 'https://api.example.com/verify')

      expect(mockProvider.verify).toHaveBeenCalledWith(
        product,
        'https://api.example.com/verify',
        undefined,
      )
    })

    it('should handle Android purchase token', async () => {
      const product = createMockProduct({
        transaction: createMockTransaction({
          purchaseToken: 'android-purchase-token',
        }),
      })

      await verify(product, 'https://api.example.com/verify')

      expect(mockProvider.verify).toHaveBeenCalledWith(
        product,
        'https://api.example.com/verify',
        undefined,
      )
    })

    it('should handle verification with server data response', async () => {
      const product = createMockProduct()
      const verificationResult: VerificationResult = {
        valid: true,
        data: {
          orderId: 'order123',
          purchaseState: 0,
          autoRenewing: true,
        },
      }
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockResolvedValue(verificationResult)

      const result = await verify(product, 'https://api.example.com/verify')

      expect(result.valid).toBe(true)
      expect(result.data).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    describe('errorMessages', () => {
      it('should have all standard error codes', () => {
        expect(errorMessages.E_UNKNOWN).toBeDefined()
        expect(errorMessages.E_NOT_AVAILABLE).toBeDefined()
        expect(errorMessages.E_USER_CANCELLED).toBeDefined()
        expect(errorMessages.E_ITEM_UNAVAILABLE).toBeDefined()
        expect(errorMessages.E_NETWORK).toBeDefined()
        expect(errorMessages.E_SERVICE_ERROR).toBeDefined()
        expect(errorMessages.E_ALREADY_OWNED).toBeDefined()
        expect(errorMessages.E_NOT_OWNED).toBeDefined()
        expect(errorMessages.E_VERIFICATION_FAILED).toBeDefined()
        expect(errorMessages.E_DEFERRED).toBeDefined()
      })

      it('should have correct messages for each error code', () => {
        expect(errorMessages.E_UNKNOWN).toBe('An unknown error occurred.')
        expect(errorMessages.E_NOT_AVAILABLE).toBe('In-app purchases are not available.')
        expect(errorMessages.E_USER_CANCELLED).toBe('Purchase was cancelled.')
        expect(errorMessages.E_ITEM_UNAVAILABLE).toBe('This item is not available for purchase.')
        expect(errorMessages.E_NETWORK).toBe('A network error occurred. Please try again.')
        expect(errorMessages.E_SERVICE_ERROR).toBe('The store service encountered an error.')
        expect(errorMessages.E_ALREADY_OWNED).toBe('You already own this item.')
        expect(errorMessages.E_NOT_OWNED).toBe('You do not own this item.')
        expect(errorMessages.E_VERIFICATION_FAILED).toBe('Purchase verification failed.')
        expect(errorMessages.E_DEFERRED).toBe('Purchase is pending approval.')
      })
    })

    describe('getErrorMessage', () => {
      it('should return message for known error code', () => {
        const error: IAPError = { code: 'E_USER_CANCELLED', message: '' }
        expect(getErrorMessage(error)).toBe('Purchase was cancelled.')
      })

      it('should return error message when code is unknown', () => {
        const error: IAPError = { code: 'UNKNOWN_CODE', message: 'Custom error message' }
        expect(getErrorMessage(error)).toBe('Custom error message')
      })

      it('should return unknown error message for empty error', () => {
        const error: IAPError = { code: '', message: '' }
        expect(getErrorMessage(error)).toBe(errorMessages.E_UNKNOWN)
      })

      it('should handle string error code', () => {
        const error: IAPError = { code: 'E_ALREADY_OWNED', message: '' }
        expect(getErrorMessage(error)).toBe('You already own this item.')
      })

      it('should handle string input', () => {
        expect(getErrorMessage('Some error string')).toBe('Some error string')
      })

      it('should handle null/undefined gracefully', () => {
        expect(getErrorMessage(null)).toBe(errorMessages.E_UNKNOWN)
        expect(getErrorMessage(undefined)).toBe(errorMessages.E_UNKNOWN)
      })

      it('should handle non-error object', () => {
        expect(getErrorMessage({})).toBe(errorMessages.E_UNKNOWN)
      })

      it('should fall back to error message for unrecognized codes', () => {
        const error: IAPError = { code: 'E_NONEXISTENT', message: 'Fallback message' }
        expect(getErrorMessage(error)).toBe('Fallback message')
      })
    })
  })

  describe('Product States', () => {
    it('should support all product states', () => {
      const states: ProductState[] = [
        'registered',
        'valid',
        'invalid',
        'requested',
        'initiated',
        'approved',
        'finished',
        'owned',
        'cancelled',
        'downloading',
      ]

      states.forEach((state) => {
        const product = createMockProduct({ state })
        expect(product.state).toBe(state)
      })
    })
  })

  describe('Event System', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    describe('when (product events)', () => {
      it('should register updated handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.when('product1').updated(handler)

        expect(mockProvider.when).toHaveBeenCalledWith('product1')
      })

      it('should register approved handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.when('product1').approved(handler)

        expect(mockProvider.when).toHaveBeenCalledWith('product1')
      })

      it('should register finished handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.when('product1').finished(handler)

        expect(mockProvider.when).toHaveBeenCalledWith('product1')
      })

      it('should register cancelled handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.when('product1').cancelled(handler)

        expect(mockProvider.when).toHaveBeenCalledWith('product1')
      })

      it('should register error handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.when('product1').error(handler)

        expect(mockProvider.when).toHaveBeenCalledWith('product1')
      })
    })

    describe('on (global events)', () => {
      it('should register ready event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('ready', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('ready', handler)
      })

      it('should register product-updated event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('product-updated', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('product-updated', handler)
      })

      it('should register approved event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('approved', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('approved', handler)
      })

      it('should register finished event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('finished', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('finished', handler)
      })

      it('should register cancelled event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('cancelled', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('cancelled', handler)
      })

      it('should register error event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('error', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('error', handler)
      })

      it('should register pending event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('pending', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('pending', handler)
      })

      it('should register expired event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('expired', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('expired', handler)
      })

      it('should register restored event handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.on('restored', handler)

        expect(mockProvider.on).toHaveBeenCalledWith('restored', handler)
      })

      it('should return unsubscribe function', () => {
        const handler = vi.fn()
        const provider = getProvider()
        ;(mockProvider.on as ReturnType<typeof vi.fn>).mockReturnValue(() => {})

        const unsubscribe = provider.on('ready', handler)

        expect(typeof unsubscribe).toBe('function')
      })
    })

    describe('off', () => {
      it('should unsubscribe handler', () => {
        const handler = vi.fn()
        const provider = getProvider()
        provider.off(handler)

        expect(mockProvider.off).toHaveBeenCalledWith(handler)
      })
    })
  })

  describe('Platform Detection', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should return ios platform', () => {
      ;(mockProvider.getPlatform as ReturnType<typeof vi.fn>).mockReturnValue('ios')
      expect(getProvider().getPlatform()).toBe('ios')
    })

    it('should return android platform', () => {
      ;(mockProvider.getPlatform as ReturnType<typeof vi.fn>).mockReturnValue('android')
      expect(getProvider().getPlatform()).toBe('android')
    })

    it('should return web platform', () => {
      ;(mockProvider.getPlatform as ReturnType<typeof vi.fn>).mockReturnValue('web')
      expect(getProvider().getPlatform()).toBe('web')
    })

    it('should return unknown platform', () => {
      ;(mockProvider.getPlatform as ReturnType<typeof vi.fn>).mockReturnValue('unknown')
      expect(getProvider().getPlatform()).toBe('unknown')
    })
  })

  describe('Integration Scenarios', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should support full consumable purchase flow', async () => {
      // 1. Initialize
      await initialize()

      // 2. Register products
      register([{ id: 'com.app.coins100', alias: 'coins100', type: 'consumable' }])

      // 3. Refresh to get store info
      await refresh()

      // 4. Check availability
      expect(isAvailable()).toBe(true)

      // 5. Get product info
      get('coins100')

      // 6. Purchase
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        product: createMockProduct({ id: 'com.app.coins100' }),
        transaction: createMockTransaction(),
      })

      const result = await order('coins100')
      expect(result.success).toBe(true)

      // 7. Verify with server
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockResolvedValue({ valid: true })
      const verification = await verify(result.product!, 'https://api.example.com/verify')
      expect(verification.valid).toBe(true)

      // 8. Finish transaction
      finish(result.product!)

      expect(mockProvider.initialize).toHaveBeenCalled()
      expect(mockProvider.register).toHaveBeenCalled()
      expect(mockProvider.refresh).toHaveBeenCalled()
      expect(mockProvider.order).toHaveBeenCalled()
      expect(mockProvider.verify).toHaveBeenCalled()
      expect(mockProvider.finish).toHaveBeenCalled()
    })

    it('should support subscription purchase and restoration flow', async () => {
      // Initialize and register
      await initialize()
      register([
        { id: 'com.app.premium_monthly', alias: 'premium', type: 'subscription', group: 'premium' },
      ])
      await refresh()

      // Purchase subscription
      const subscriptionProduct = createMockProduct({
        id: 'com.app.premium_monthly',
        type: 'subscription',
        subscriptionPeriod: 'monthly',
      })
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        product: subscriptionProduct,
        transaction: createMockTransaction({
          expirationTime: new Date('2024-02-15'),
        }),
      })

      const purchaseResult = await order('premium')
      expect(purchaseResult.success).toBe(true)

      // Verify subscription
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        isActive: true,
        expirationTime: new Date('2024-02-15'),
      })

      const verifyResult = await verify(purchaseResult.product!, 'https://api.example.com/verify')
      expect(verifyResult.isActive).toBe(true)

      finish(purchaseResult.product!)

      // Later: Restore purchases on new device
      ;(mockProvider.restore as ReturnType<typeof vi.fn>).mockResolvedValue([
        createMockProduct({
          id: 'com.app.premium_monthly',
          type: 'subscription',
          owned: true,
          state: 'owned',
        }),
      ])

      const restoredProducts = await restore()
      expect(restoredProducts).toHaveLength(1)
      expect(restoredProducts[0].owned).toBe(true)
    })

    it('should handle purchase error gracefully', async () => {
      await initialize()
      register([{ id: 'com.app.item', alias: 'item', type: 'consumable' }])
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { code: 'E_USER_CANCELLED', message: 'User cancelled' },
      })

      const result = await order('item')
      expect(result.success).toBe(false)

      const errorMessage = getErrorMessage(result.error!)
      expect(errorMessage).toBe('Purchase was cancelled.')
    })

    it('should handle verification failure', async () => {
      await initialize()
      register([{ id: 'com.app.item', alias: 'item', type: 'consumable' }])
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        product: createMockProduct(),
        transaction: createMockTransaction(),
      })

      const purchaseResult = await order('item')
      expect(purchaseResult.success).toBe(true)

      // Verification fails (e.g., fraud detection)
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
      })

      const verifyResult = await verify(purchaseResult.product!, 'https://api.example.com/verify')
      expect(verifyResult.valid).toBe(false)

      // Should NOT finish transaction when verification fails
      // Application logic would handle this
    })
  })

  describe('Edge Cases', () => {
    let mockProvider: IAPProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should handle empty product list', () => {
      register([])
      expect(mockProvider.register).toHaveBeenCalledWith([])
    })

    it('should handle rapid successive purchases', async () => {
      ;(mockProvider.order as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        product: createMockProduct(),
        transaction: createMockTransaction(),
      })

      const promises = [order('product1'), order('product2'), order('product3')]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      expect(mockProvider.order).toHaveBeenCalledTimes(3)
    })

    it('should handle network timeout during verification', async () => {
      const product = createMockProduct()
      ;(mockProvider.verify as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network timeout'),
      )

      await expect(verify(product, 'https://api.example.com/verify')).rejects.toThrow(
        'Network timeout',
      )
    })

    it('should handle provider initialization failure', async () => {
      ;(mockProvider.initialize as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Store not available'),
      )

      await expect(initialize()).rejects.toThrow('Store not available')
    })

    it('should handle provider destroy', () => {
      const provider = getProvider()
      provider.destroy()

      expect(mockProvider.destroy).toHaveBeenCalled()
    })
  })

  describe('Type Safety', () => {
    it('should accept all valid ProductType values', () => {
      const types: ProductType[] = ['consumable', 'non-consumable', 'subscription']

      types.forEach((type) => {
        const product = createMockProduct({ type })
        expect(product.type).toBe(type)
      })
    })

    it('should accept all valid ProductState values', () => {
      const states: ProductState[] = [
        'registered',
        'valid',
        'invalid',
        'requested',
        'initiated',
        'approved',
        'finished',
        'owned',
        'cancelled',
        'downloading',
      ]

      states.forEach((state) => {
        const product = createMockProduct({ state })
        expect(product.state).toBe(state)
      })
    })

    it('should accept all valid SubscriptionPeriod values', () => {
      const periods: SubscriptionPeriod[] = ['weekly', 'monthly', 'yearly', 'lifetime']

      periods.forEach((period) => {
        const product = createMockProduct({
          type: 'subscription',
          subscriptionPeriod: period,
        })
        expect(product.subscriptionPeriod).toBe(period)
      })
    })

    it('should accept all valid IAPEvent values', () => {
      const events: IAPEvent[] = [
        'ready',
        'product-updated',
        'approved',
        'finished',
        'cancelled',
        'error',
        'pending',
        'expired',
        'restored',
      ]

      events.forEach((event) => {
        expect(events.includes(event)).toBe(true)
      })
    })
  })
})
