import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { OrderItemRow, OrderRow } from '../types.js'
import { assembleOrder } from '../utilities.js'

/**
 * Retrieves a single order by ID. Only the order owner can read it.
 * @param req - The request with `params.id`.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

    const itemRows = await findMany<OrderItemRow>('order_items', {
      where: [{ field: 'orderId', operator: '=', value: orderRow.id }],
    })

    res.json(assembleOrder(orderRow, itemRows))
  } catch (error) {
    logger.error('Failed to read order', { orderId: req.params.id, error })
    res.status(500).json({
      error: t('order.error.readFailed', undefined, { defaultValue: 'Failed to read order' }),
      errorKey: 'order.error.readFailed',
    })
  }
}
