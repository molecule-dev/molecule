/**
 * Handler for retrieving stock information for a product.
 *
 * @module
 */

import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getInventorySession } from '../authorizers/index.js'
import type { StockRow } from '../types.js'
import { toStockInfo } from '../utilities.js'

/**
 * Returns stock information for the given product (and optional variant).
 * @param req - The request with `productId` param and optional `variantId` query.
 * @param res - The response object.
 */
export async function getStock(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // Stock levels are business data — require auth in the handler. Fail closed.
  if (!getInventorySession(res)?.userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }
  const { productId } = req.params
  const variantId = req.query.variantId as string | undefined

  try {
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'productId', operator: '=' as const, value: productId },
    ]

    if (variantId) {
      where.push({ field: 'variantId', operator: '=' as const, value: variantId })
    } else {
      where.push({ field: 'variantId', operator: '=' as const, value: null })
    }

    const row = await findOne<StockRow>('inventory_stock', where)

    if (!row) {
      res.status(404).json({
        error: t('inventory.error.stockNotFound', undefined, {
          defaultValue: 'Stock record not found',
        }),
        errorKey: 'inventory.error.stockNotFound',
      })
      return
    }

    res.json(toStockInfo(row))
  } catch (error) {
    logger.error('Failed to get stock', { productId, variantId, error })
    res.status(500).json({
      error: t('inventory.error.getStockFailed', undefined, {
        defaultValue: 'Failed to get stock information',
      }),
      errorKey: 'inventory.error.getStockFailed',
    })
  }
}
