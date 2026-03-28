import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { OrderItemRow, OrderRow } from '../types.js'
import { assembleOrder } from '../utilities.js'

/** Default page size for order listings. */
const DEFAULT_LIMIT = 20
/** Maximum page size. */
const MAX_LIMIT = 100

/**
 * Lists orders for the authenticated user with pagination and optional status filter.
 * @param req - The request with optional query params: status, page, limit.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('order.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'order.error.unauthorized',
    })
    return
  }

  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT))
    const offset = (page - 1) * limit
    const status = req.query.status as string | undefined

    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'userId', operator: '=' as const, value: userId },
    ]

    if (status) {
      where.push({ field: 'status', operator: '=' as const, value: status })
    }

    const [orderRows, total] = await Promise.all([
      findMany<OrderRow>('orders', {
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit,
        offset,
      }),
      count('orders', where),
    ])

    // Fetch items for all orders in a single query per order
    const orders = await Promise.all(
      orderRows.map(async (orderRow) => {
        const itemRows = await findMany<OrderItemRow>('order_items', {
          where: [{ field: 'orderId', operator: '=', value: orderRow.id }],
        })
        return assembleOrder(orderRow, itemRows)
      }),
    )

    res.json({
      data: orders,
      total,
      page,
      limit,
    })
  } catch (error) {
    logger.error('Failed to list orders', { userId, error })
    res.status(500).json({
      error: t('order.error.listFailed', undefined, { defaultValue: 'Failed to list orders' }),
      errorKey: 'order.error.listFailed',
    })
  }
}
