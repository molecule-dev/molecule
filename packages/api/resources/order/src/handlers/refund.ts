import { create as dbCreate, findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { OrderRow, OrderStatus, RefundOrderInput } from '../types.js'
import { STATUS_TRANSITIONS } from '../types.js'

/**
 * Issues a full or partial refund for an order.
 * @param req - The request with `params.id` and optional {@link RefundOrderInput} body.
 * @param res - The response object.
 */
export async function refund(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('order.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'order.error.unauthorized',
    })
    return
  }

  const input = req.body as RefundOrderInput | undefined

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
    if (!allowedTransitions || !allowedTransitions.includes('refunded')) {
      res.status(409).json({
        error: t('order.error.cannotRefund', undefined, {
          defaultValue: `Order cannot be refunded from '${orderRow.status}' status`,
        }),
        errorKey: 'order.error.cannotRefund',
      })
      return
    }

    const refundAmount = input?.amount ?? orderRow.total
    if (refundAmount <= 0 || refundAmount > orderRow.total) {
      res.status(400).json({
        error: t('order.error.invalidRefundAmount', undefined, {
          defaultValue: 'Refund amount must be between 0 and the order total',
        }),
        errorKey: 'order.error.invalidRefundAmount',
      })
      return
    }

    const now = new Date().toISOString()

    await updateById('orders', orderRow.id, {
      status: 'refunded',
      updatedAt: now,
    })

    const metadata: Record<string, unknown> = { amount: refundAmount }
    if (input?.reason) metadata.reason = input.reason

    await dbCreate('order_events', {
      orderId: orderRow.id,
      status: 'refunded',
      metadata: JSON.stringify(metadata),
    })

    logger.debug('Order refunded', {
      orderId: orderRow.id,
      amount: refundAmount,
      reason: input?.reason,
    })

    res.json({
      orderId: orderRow.id,
      amount: refundAmount,
      status: 'refunded' as const,
      refundedAt: now,
    })
  } catch (error) {
    logger.error('Failed to refund order', { orderId: req.params.id, error })
    res.status(500).json({
      error: t('order.error.refundFailed', undefined, {
        defaultValue: 'Failed to refund order',
      }),
      errorKey: 'order.error.refundFailed',
    })
  }
}
