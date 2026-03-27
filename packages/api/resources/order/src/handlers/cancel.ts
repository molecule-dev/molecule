import { create as dbCreate, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CancelOrderInput, OrderItemRow, OrderRow, OrderStatus } from '../types.js'
import { STATUS_TRANSITIONS } from '../types.js'
import { assembleOrder } from '../utilities.js'

/**
 * Cancels an order. Only the order owner can cancel, and only from valid states.
 * @param req - The request with `params.id` and optional {@link CancelOrderInput} body.
 * @param res - The response object.
 */
export async function cancel(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('order.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'order.error.unauthorized',
    })
    return
  }

  const input = req.body as CancelOrderInput | undefined

  try {
    const orderRow = await findById<OrderRow>('orders', req.params.id)

    if (!orderRow) {
      res.status(404).json({
        error: t('order.error.notFound', undefined, { defaultValue: 'Order not found' }),
        errorKey: 'order.error.notFound',
      })
      return
    }

    if (orderRow.userId !== userId) {
      res.status(403).json({
        error: t('order.error.forbidden', undefined, {
          defaultValue: 'You do not have access to this order',
        }),
        errorKey: 'order.error.forbidden',
      })
      return
    }

    const allowedTransitions = STATUS_TRANSITIONS[orderRow.status as OrderStatus]
    if (!allowedTransitions || !allowedTransitions.includes('cancelled')) {
      res.status(409).json({
        error: t('order.error.cannotCancel', undefined, {
          defaultValue: `Order cannot be cancelled from '${orderRow.status}' status`,
        }),
        errorKey: 'order.error.cannotCancel',
      })
      return
    }

    const now = new Date().toISOString()

    await updateById('orders', orderRow.id, {
      status: 'cancelled',
      updatedAt: now,
    })

    const metadata: Record<string, unknown> = {}
    if (input?.reason) metadata.reason = input.reason

    await dbCreate('order_events', {
      orderId: orderRow.id,
      status: 'cancelled',
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
    })

    const updatedRow: OrderRow = { ...orderRow, status: 'cancelled', updatedAt: now }
    const itemRows = await findMany<OrderItemRow>('order_items', {
      where: [{ field: 'orderId', operator: '=' as const, value: orderRow.id }],
    })

    logger.debug('Order cancelled', { orderId: orderRow.id, userId, reason: input?.reason })

    res.json(assembleOrder(updatedRow, itemRows))
  } catch (error) {
    logger.error('Failed to cancel order', { orderId: req.params.id, error })
    res.status(500).json({
      error: t('order.error.cancelFailed', undefined, {
        defaultValue: 'Failed to cancel order',
      }),
      errorKey: 'order.error.cancelFailed',
    })
  }
}
