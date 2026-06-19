/**
 * Handler for reserving stock for an order.
 *
 * @module
 */

import { create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getInventorySession } from '../authorizers/index.js'
import type { ReservationRow, ReserveStockInput, StockMovementRow, StockRow } from '../types.js'
import { toReservation } from '../utilities.js'

/**
 * Reserves stock for the given product and order.
 * @param req - The request with `productId` param and {@link ReserveStockInput} body.
 * @param res - The response object.
 */
export async function reserve(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // A reservation is tied to the caller's cart/order — require an authenticated
  // user and bind the reservation to them so release/confirm can verify
  // ownership. Fail closed in-handler regardless of route middleware.
  const userId = getInventorySession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { productId } = req.params
  const input = req.body as ReserveStockInput
  const variantId = (req.query.variantId as string | undefined) ?? null

  if (!input.quantity || input.quantity < 1) {
    res.status(400).json({
      error: t('inventory.error.invalidQuantity', undefined, {
        defaultValue: 'Quantity must be at least 1',
      }),
      errorKey: 'inventory.error.invalidQuantity',
    })
    return
  }

  if (!input.orderId) {
    res.status(400).json({
      error: t('inventory.error.orderIdRequired', undefined, {
        defaultValue: 'Order ID is required',
      }),
      errorKey: 'inventory.error.orderIdRequired',
    })
    return
  }

  try {
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'productId', operator: '=' as const, value: productId },
      { field: 'variantId', operator: '=' as const, value: variantId },
    ]

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

    const available = row.total - row.reserved
    if (input.quantity > available) {
      res.status(409).json({
        error: t('inventory.error.insufficientAvailable', undefined, {
          defaultValue: 'Insufficient stock available',
        }),
        errorKey: 'inventory.error.insufficientAvailable',
      })
      return
    }

    // Create reservation record
    const reservationResult = await create<ReservationRow>('inventory_reservations', {
      productId,
      variantId,
      quantity: input.quantity,
      orderId: input.orderId,
      userId,
    })

    // Increase reserved count
    await updateById('inventory_stock', row.id, {
      reserved: row.reserved + input.quantity,
    })

    // Record movement
    await create<StockMovementRow>('inventory_movements', {
      productId,
      variantId,
      type: 'reservation',
      quantity: -input.quantity,
      reason: null,
      referenceId: input.orderId,
    })

    logger.debug('Stock reserved', {
      productId,
      variantId,
      quantity: input.quantity,
      orderId: input.orderId,
    })

    res.status(201).json(toReservation(reservationResult.data!))
  } catch (error) {
    logger.error('Failed to reserve stock', { productId, error })
    res.status(500).json({
      error: t('inventory.error.reserveFailed', undefined, {
        defaultValue: 'Failed to reserve stock',
      }),
      errorKey: 'inventory.error.reserveFailed',
    })
  }
}
