/**
 * Handler for retrieving stock movement history for a product.
 *
 * @module
 */

import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getInventorySession } from '../authorizers/index.js'
import type { StockMovementRow } from '../types.js'
import { toStockMovement } from '../utilities.js'

/** Default page size. */
const DEFAULT_LIMIT = 20
/** Maximum page size. */
const MAX_LIMIT = 100

/**
 * Returns paginated stock movement history for the given product.
 * @param req - The request with `productId` param and optional pagination query params.
 * @param res - The response object.
 */
export async function getMovements(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // The full stock ledger for a product — require auth in the handler. Fail closed.
  if (!getInventorySession(res)?.userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }
  const { productId } = req.params

  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT))
    const offset = (page - 1) * limit

    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'productId', operator: '=' as const, value: productId },
    ]

    const [rows, total] = await Promise.all([
      findMany<StockMovementRow>('inventory_movements', {
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit,
        offset,
      }),
      count('inventory_movements', where),
    ])

    res.json({
      data: rows.map(toStockMovement),
      total,
      page,
      limit,
    })
  } catch (error) {
    logger.error('Failed to get stock movements', { productId, error })
    res.status(500).json({
      error: t('inventory.error.movementsFailed', undefined, {
        defaultValue: 'Failed to get stock movements',
      }),
      errorKey: 'inventory.error.movementsFailed',
    })
  }
}
