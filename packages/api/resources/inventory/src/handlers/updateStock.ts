/**
 * Handler for updating stock levels for a product.
 *
 * @module
 */

import { create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { StockAdjustment, StockMovementRow, StockRow } from '../types.js'
import { toStockInfo } from '../utilities.js'

/** Valid adjustment types. */
const VALID_TYPES = ['add', 'remove', 'set'] as const

/**
 * Updates stock for the given product. Creates the stock record if it doesn't exist.
 * @param req - The request with `productId` param and {@link StockAdjustment} body.
 * @param res - The response object.
 */
export async function updateStock(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { productId } = req.params
  const input = req.body as StockAdjustment

  if (input.quantity == null || !VALID_TYPES.includes(input.type as (typeof VALID_TYPES)[number])) {
    res.status(400).json({
      error: t('inventory.error.invalidAdjustment', undefined, {
        defaultValue: 'Invalid adjustment: quantity and valid type (add, remove, set) are required',
      }),
      errorKey: 'inventory.error.invalidAdjustment',
    })
    return
  }

  if (input.quantity < 0) {
    res.status(400).json({
      error: t('inventory.error.negativeQuantity', undefined, {
        defaultValue: 'Quantity must be non-negative',
      }),
      errorKey: 'inventory.error.negativeQuantity',
    })
    return
  }

  try {
    const variantId = input.variantId ?? null

    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'productId', operator: '=' as const, value: productId },
      { field: 'variantId', operator: '=' as const, value: variantId },
    ]

    let row = await findOne<StockRow>('inventory_stock', where)

    let newTotal: number

    if (!row) {
      // Create new stock record
      newTotal = input.type === 'set' ? input.quantity : input.type === 'add' ? input.quantity : 0
      const result = await create<StockRow>('inventory_stock', {
        productId,
        variantId,
        total: newTotal,
        reserved: 0,
        lowStockThreshold: 10,
      })
      row = result.data!
    } else {
      // Update existing record
      if (input.type === 'add') {
        newTotal = row.total + input.quantity
      } else if (input.type === 'remove') {
        newTotal = row.total - input.quantity
        if (newTotal < row.reserved) {
          res.status(409).json({
            error: t('inventory.error.insufficientStock', undefined, {
              defaultValue: 'Cannot remove: would drop below reserved quantity',
            }),
            errorKey: 'inventory.error.insufficientStock',
          })
          return
        }
      } else {
        // 'set'
        newTotal = input.quantity
        if (newTotal < row.reserved) {
          res.status(409).json({
            error: t('inventory.error.insufficientStock', undefined, {
              defaultValue: 'Cannot set: value is below reserved quantity',
            }),
            errorKey: 'inventory.error.insufficientStock',
          })
          return
        }
      }

      const updateResult = await updateById<StockRow>('inventory_stock', row.id, {
        total: newTotal,
      })
      row = updateResult.data ?? { ...row, total: newTotal }
    }

    // Record movement
    const movementQuantity =
      input.type === 'add' ? input.quantity : input.type === 'remove' ? -input.quantity : newTotal

    await create<StockMovementRow>('inventory_movements', {
      productId,
      variantId,
      type: 'adjustment',
      quantity: movementQuantity,
      reason: input.reason ?? null,
      referenceId: null,
    })

    logger.debug('Stock updated', {
      productId,
      variantId,
      type: input.type,
      quantity: input.quantity,
    })

    res.json(toStockInfo(row))
  } catch (error) {
    logger.error('Failed to update stock', { productId, error })
    res.status(500).json({
      error: t('inventory.error.updateFailed', undefined, {
        defaultValue: 'Failed to update stock',
      }),
      errorKey: 'inventory.error.updateFailed',
    })
  }
}
