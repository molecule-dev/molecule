/**
 * No-op IAP provider implementation for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { IAPEvent, IAPEventHandler, IAPProvider, Product, ProductDefinition } from './types.js'

/**
 * Creates a no-op IAP provider for web/testing.
 * @returns A no-op IAP provider that stubs all purchase operations.
 */
export const createNoopIAPProvider = (): IAPProvider => {
  const products = new Map<string, Product>()
  const handlers = new Map<string, Set<IAPEventHandler>>()

  return {
    async initialize() {
      // No-op
    },

    register(definitions: ProductDefinition[]) {
      for (const def of definitions) {
        products.set(def.id, {
          id: def.id,
          alias: def.alias,
          type: def.type,
          state: 'registered',
          title: def.alias,
          description: '',
          price: '$0.00',
          priceMicros: 0,
          currency: 'USD',
          canPurchase: false,
          owned: false,
          group: def.group,
        })
        products.set(def.alias, products.get(def.id)!)
      }
    },

    async refresh() {
      // No-op
    },

    get(idOrAlias: string) {
      return products.get(idOrAlias)
    },

    getAll() {
      return Array.from(new Set(products.values()))
    },

    canPurchase() {
      return false
    },

    async order() {
      return {
        success: false,
        error: {
          code: 'E_NOT_AVAILABLE',
          message: t('iap.error.E_NOT_AVAILABLE', undefined, {
            defaultValue: 'In-app purchases are not available.',
          }),
        },
      }
    },

    finish() {
      // No-op
    },

    async verify() {
      return { valid: false }
    },

    async restore() {
      return []
    },

    manageSubscriptions() {
      // No-op
    },

    when() {
      return {
        updated: () => {},
        approved: () => {},
        finished: () => {},
        cancelled: () => {},
        error: () => {},
      }
    },

    on(event: IAPEvent, handler: IAPEventHandler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(handler)
      return () => handlers.get(event)?.delete(handler)
    },

    off(handler: IAPEventHandler) {
      handlers.forEach((set) => set.delete(handler))
    },

    getPlatform() {
      return 'web'
    },

    isAvailable() {
      return false
    },

    destroy() {
      products.clear()
      handlers.clear()
    },
  }
}
