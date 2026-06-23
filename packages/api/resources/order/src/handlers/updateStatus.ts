import { create as dbCreate, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { canDriveOrderLifecycle } from '../authorizers/index.js'
import type { OrderItemRow, OrderRow, OrderStatus, UpdateOrderStatusInput } from '../types.js'
import { BUYER_ALLOWED_TRANSITIONS, ORDER_STATUSES, STATUS_TRANSITIONS } from '../types.js'
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

    // A transition INTO a merchant state (confirmed/processing/shipped/delivered/
    // refunded) is merchant-only; only the buyer-reachable transitions (a pending
    // order's owner cancelling) stay owner-gated.
    const buyerAllowed = BUYER_ALLOWED_TRANSITIONS[orderRow.status as OrderStatus]?.includes(
      input.status,
    )
    if (buyerAllowed) {
      if (orderRow.userId !== userId) {
        res.status(403).json({
          error: t('order.error.forbidden', undefined, {
            defaultValue: 'You do not have access to this order',
          }),
          errorKey: 'order.error.forbidden',
        })
        return
      }
    } else {
      // Merchant-state transition — fail-closed: require a registered merchant
      // authorizer that approves the caller (403 when none is set).
      if (!(await canDriveOrderLifecycle(orderRow, userId, req))) {
        res.status(403).json({
          error: t('order.error.merchantForbidden', undefined, {
            defaultValue: 'Merchant authorization is required to manage this order',
          }),
          errorKey: 'order.error.merchantForbidden',
        })
        return
      }
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
