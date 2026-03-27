/**
 * Handler for releasing a stock reservation.
 *
 * @module
 */

import { create, deleteById, findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { ReservationRow, StockMovementRow, StockRow } from '../types.js'

/**
 * Releases a stock reservation, returning the reserved quantity to available stock.
 * @param req - The request with `reservationId` param.
 * @param res - The response object.
 */
export async function release(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { reservationId } = req.params

  try {
    const reservation = await findById<ReservationRow>('inventory_reservations', reservationId)

    if (!reservation) {
      res.status(404).json({
        error: t('inventory.error.reservationNotFound', undefined, {
          defaultValue: 'Reservation not found',
        }),
        errorKey: 'inventory.error.reservationNotFound',
      })
      return
    }

    // Find the stock record
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'productId', operator: '=' as const, value: reservation.productId },
      { field: 'variantId', operator: '=' as const, value: reservation.variantId },
    ]

    const stockRow = await findOne<StockRow>('inventory_stock', where)

    if (stockRow) {
      // Decrease reserved count
      await updateById('inventory_stock', stockRow.id, {
        reserved: Math.max(0, stockRow.reserved - reservation.quantity),
      })
    }

    // Record movement
    await create<StockMovementRow>('inventory_movements', {
      productId: reservation.productId,
      variantId: reservation.variantId,
      type: 'release',
      quantity: reservation.quantity,
      reason: null,
      referenceId: reservationId,
    })

    // Delete reservation
    await deleteById('inventory_reservations', reservationId)

    logger.debug('Reservation released', { reservationId, productId: reservation.productId })

    res.status(204).end()
  } catch (error) {
    logger.error('Failed to release reservation', { reservationId, error })
    res.status(500).json({
      error: t('inventory.error.releaseFailed', undefined, {
        defaultValue: 'Failed to release reservation',
      }),
      errorKey: 'inventory.error.releaseFailed',
    })
  }
}
