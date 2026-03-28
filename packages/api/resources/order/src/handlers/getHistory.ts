import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { OrderEventRow, OrderRow } from '../types.js'
import { toOrderEvent } from '../utilities.js'

/**
 * Returns the event history for an order. Only the order owner can view history.
 * @param req - The request with `params.id`.
 * @param res - The response object.
 */
export async function getHistory(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('order.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'order.error.unauthorized',
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

    if (orderRow.userId !== userId) {
      res.status(403).json({
        error: t('order.error.forbidden', undefined, {
          defaultValue: 'You do not have access to this order',
        }),
        errorKey: 'order.error.forbidden',
      })
      return
    }

    const eventRows = await findMany<OrderEventRow>('order_events', {
      where: [{ field: 'orderId', operator: '=' as const, value: orderRow.id }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    res.json(eventRows.map(toOrderEvent))
  } catch (error) {
    logger.error('Failed to get order history', { orderId: req.params.id, error })
    res.status(500).json({
      error: t('order.error.historyFailed', undefined, {
        defaultValue: 'Failed to get order history',
      }),
      errorKey: 'order.error.historyFailed',
    })
  }
}
