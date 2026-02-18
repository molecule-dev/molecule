/**
 * IAP provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createNoopIAPProvider } from './iap.js'
import type {
  IAPProvider,
  Product,
  ProductDefinition,
  PurchaseResult,
  VerificationResult,
} from './types.js'

const BOND_TYPE = 'iap'

/**
 * Sets the IAP provider.
 * @param provider - The IAP provider implementation to bond.
 */
export const setProvider = (provider: IAPProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Gets the current IAP provider. Falls back to a no-op provider if none has been bonded.
 * @returns The active IAP provider instance.
 */
export const getProvider = (): IAPProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createNoopIAPProvider())
  }
  return bondGet<IAPProvider>(BOND_TYPE)!
}

/**
 * Checks if an IAP provider has been bonded.
 * @returns Whether an IAP provider is currently registered.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Initializes the IAP system via the active provider.
 * @returns A promise that resolves when initialization is complete.
 */
export const initialize = (): Promise<void> => getProvider().initialize()

/**
 * Registers product definitions with the IAP provider.
 * @param products - The product definitions to register for purchase availability.
 * @returns Nothing.
 */
export const register = (products: ProductDefinition[]): void => getProvider().register(products)

/**
 * Refreshes product information from the store.
 * @returns A promise that resolves when product data has been refreshed.
 */
export const refresh = (): Promise<void> => getProvider().refresh()

/**
 * Gets a product by its store ID or registered alias.
 * @param idOrAlias - The product store ID or alias to look up.
 * @returns The matching product, or undefined if not found.
 */
export const get = (idOrAlias: string): Product | undefined => getProvider().get(idOrAlias)

/**
 * Gets all registered products.
 * @returns An array of all available products.
 */
export const getAll = (): Product[] => getProvider().getAll()

/**
 * Initiates a purchase order for a product.
 * @param idOrAlias - The product store ID or alias to purchase.
 * @returns A promise that resolves with the purchase result.
 */
export const order = (idOrAlias: string): Promise<PurchaseResult> => getProvider().order(idOrAlias)

/**
 * Finishes a pending transaction, acknowledging delivery to the store.
 * @param product - The product whose transaction should be finalized.
 * @returns Nothing.
 */
export const finish = (product: Product): void => getProvider().finish(product)

/**
 * Verifies a purchase receipt with a server endpoint.
 * @param product - The product whose purchase receipt to verify.
 * @param verifyUrl - The server URL to send the verification request to.
 * @param additionalData - Extra data to include in the verification payload.
 * @returns A promise that resolves with the server verification result.
 */
export const verify = (
  product: Product,
  verifyUrl: string,
  additionalData?: Record<string, unknown>,
): Promise<VerificationResult> => getProvider().verify(product, verifyUrl, additionalData)

/**
 * Restores previously completed purchases from the store.
 * @returns A promise that resolves with an array of restored products.
 */
export const restore = (): Promise<Product[]> => getProvider().restore()

/**
 * Opens the platform's subscription management UI.
 * @returns Nothing.
 */
export const manageSubscriptions = (): void => getProvider().manageSubscriptions()

/**
 * Checks if in-app purchases are available on the current platform.
 * @returns Whether the IAP system is available and functional.
 */
export const isAvailable = (): boolean => getProvider().isAvailable()
