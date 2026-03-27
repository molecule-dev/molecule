import { create as dbCreate, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { OrderItemRow, OrderRow, OrderStatus, UpdateOrderStatusInput } from '../types.js'
import { ORDER_STATUSES, STATUS_TRANSITIONS } from '../types.js'
import { assembleOrder } from '../utilities.js'

/**
 * Updates an order's status with transition validation.
 * @param req - The request with `params.id` and {@link UpdateOrderStatusInput} body.
 * @param res - The response object.
 */
export async function updateStatus(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('order.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'order.error.unauthorized',
    })
    return
  }

  const input = req.body as UpdateOrderStatusInput

  if (!input.status || !ORDER_STATUSES.includes(input.status)) {
    res.status(400).json({
      error: t('order.error.invalidStatus', undefined, { defaultValue: 'Invalid order status' }),
      errorKey: 'order.error.invalidStatus',
    })
    return
  }

  try {
    const orderRow = await findById<OrderRow>('orders', req.params.id)

    if (!orderRow) {
      res.status(404).json({
        error: t('order.error.notFound', undefined, { defaultValue: 'Order not found' }),
        errorKey: 'order.error.notFound',
      })
      return
    }

    const allowedTransitions = STATUS_TRANSITIONS[orderRow.status as OrderStatus]
    if (!allowedTransitions || !allowedTransitions.includes(input.status)) {
      res.status(409).json({
        error: t('order.error.invalidTransition', undefined, {
          defaultValue: `Cannot transition from '${orderRow.status}' to '${input.status}'`,
        }),
        errorKey: 'order.error.invalidTransition',
      })
      return
    }

    const now = new Date().toISOString()

    await updateById('orders', orderRow.id, {
      status: input.status,
      updatedAt: now,
    })

    await dbCreate('order_events', {
      orderId: orderRow.id,
      status: input.status,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })

    const updatedRow: OrderRow = { ...orderRow, status: input.status, updatedAt: now }
    const itemRows = await findMany<OrderItemRow>('order_items', {
      where: [{ field: 'orderId', operator: '=' as const, value: orderRow.id }],
    })

    logger.debug('Order status updated', {
      orderId: orderRow.id,
      from: orderRow.status,
      to: input.status,
    })

    res.json(assembleOrder(updatedRow, itemRows))
  } catch (error) {
    logger.error('Failed to update order status', { orderId: req.params.id, error })
    res.status(500).json({
      error: t('order.error.updateStatusFailed', undefined, {
        defaultValue: 'Failed to update order status',
      }),
      errorKey: 'order.error.updateStatusFailed',
    })
  }
}
