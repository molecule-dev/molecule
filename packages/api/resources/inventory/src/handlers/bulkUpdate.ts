/**
 * Handler for bulk stock updates.
 *
 * @module
 */

import { create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type {
  BulkStockAdjustment,
  BulkUpdateItemResult,
  StockMovementRow,
  StockRow,
} from '../types.js'
import { toStockInfo } from '../utilities.js'

/** Valid adjustment types. */
const VALID_TYPES = ['add', 'remove', 'set'] as const

/**
 * Processes multiple stock adjustments in a single request.
 * @param req - The request with `adjustments` array body.
 * @param res - The response object.
 */
export async function bulkUpdate(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { adjustments } = req.body as { adjustments?: BulkStockAdjustment[] }

  if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
    res.status(400).json({
      error: t('inventory.error.adjustmentsRequired', undefined, {
        defaultValue: 'At least one adjustment is required',
      }),
      errorKey: 'inventory.error.adjustmentsRequired',
    })
    return
  }

  try {
    const results: BulkUpdateItemResult[] = []
    let succeeded = 0
    let failed = 0

    for (const adjustment of adjustments) {
      try {
        if (
          !adjustment.productId ||
          adjustment.quantity == null ||
          adjustment.quantity < 0 ||
          !VALID_TYPES.includes(adjustment.type as (typeof VALID_TYPES)[number])
        ) {
          results.push({
            productId: adjustment.productId ?? 'unknown',
            variantId: adjustment.variantId,
            success: false,
            error: 'Invalid adjustment parameters',
          })
          failed++
          continue
        }

        const variantId = adjustment.variantId ?? null

        const where: { field: string; operator: '='; value: unknown }[] = [
          { field: 'productId', operator: '=' as const, value: adjustment.productId },
          { field: 'variantId', operator: '=' as const, value: variantId },
        ]

        let row = await findOne<StockRow>('inventory_stock', where)

        let newTotal: number

        if (!row) {
          newTotal =
            adjustment.type === 'set'
              ? adjustment.quantity
              : adjustment.type === 'add'
                ? adjustment.quantity
                : 0

          const createResult = await create<StockRow>('inventory_stock', {
            productId: adjustment.productId,
            variantId,
            total: newTotal,
            reserved: 0,
            lowStockThreshold: 10,
          })
          row = createResult.data!
        } else {
          if (adjustment.type === 'add') {
            newTotal = row.total + adjustment.quantity
          } else if (adjustment.type === 'remove') {
            newTotal = row.total - adjustment.quantity
            if (newTotal < row.reserved) {
              results.push({
                productId: adjustment.productId,
                variantId: adjustment.variantId,
                success: false,
                error: 'Would drop below reserved quantity',
              })
              failed++
              continue
            }
          } else {
            newTotal = adjustment.quantity
            if (newTotal < row.reserved) {
              results.push({
                productId: adjustment.productId,
                variantId: adjustment.variantId,
                success: false,
                error: 'Value is below reserved quantity',
              })
              failed++
              continue
            }
          }

          const updateResult = await updateById<StockRow>('inventory_stock', row.id, {
            total: newTotal,
          })
          row = updateResult.data ?? { ...row, total: newTotal }
        }

        // Record movement
        const movementQuantity =
          adjustment.type === 'add'
            ? adjustment.quantity
            : adjustment.type === 'remove'
              ? -adjustment.quantity
              : newTotal

        await create<StockMovementRow>('inventory_movements', {
          productId: adjustment.productId,
          variantId,
          type: 'adjustment',
          quantity: movementQuantity,
          reason: adjustment.reason ?? null,
          referenceId: null,
        })

        results.push({
          productId: adjustment.productId,
          variantId: adjustment.variantId,
          success: true,
          stock: toStockInfo(row),
        })
        succeeded++
      } catch {
        results.push({
          productId: adjustment.productId ?? 'unknown',
          variantId: adjustment.variantId,
          success: false,
          error: 'Internal error processing adjustment',
        })
        failed++
      }
    }

    logger.debug('Bulk stock update completed', {
      total: adjustments.length,
      succeeded,
      failed,
    })

    res.json({
      total: adjustments.length,
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    logger.error('Failed to process bulk stock update', { error })
    res.status(500).json({
      error: t('inventory.error.bulkUpdateFailed', undefined, {
        defaultValue: 'Failed to process bulk stock update',
      }),
      errorKey: 'inventory.error.bulkUpdateFailed',
    })
  }
}
