import { create as dbCreate } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateOrderInput, OrderItemRow, OrderRow } from '../types.js'
import { assembleOrder, computeSubtotal } from '../utilities.js'

/**
 * Creates a new order from the request body.
 * @param req - The request with {@link CreateOrderInput} body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('order.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'order.error.unauthorized',
    })
    return
  }

  const input = req.body as CreateOrderInput

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    res.status(400).json({
      error: t('order.error.itemsRequired', undefined, {
        defaultValue: 'At least one item is required',
      }),
      errorKey: 'order.error.itemsRequired',
    })
    return
  }

  for (const item of input.items) {
    if (
      !item.productId ||
      !item.name ||
      item.price == null ||
      !item.quantity ||
      item.quantity < 1
    ) {
      res.status(400).json({
        error: t('order.error.invalidItem', undefined, {
          defaultValue: 'Each item must have productId, name, price, and quantity >= 1',
        }),
        errorKey: 'order.error.invalidItem',
      })
      return
    }
  }

  try {
    const subtotal = computeSubtotal(input.items)
    const discount = input.discount ?? 0
    const tax = input.tax ?? 0
    const shipping = input.shipping ?? 0
    const total = subtotal - discount + tax + shipping

    const orderResult = await dbCreate<OrderRow>('orders', {
      userId,
      status: 'pending',
      subtotal,
      tax,
      shipping,
      discount,
      total,
      shippingAddress: input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
      billingAddress: input.billingAddress ? JSON.stringify(input.billingAddress) : null,
      paymentId: input.paymentId ?? null,
      notes: input.notes ?? null,
    })

    const orderRow = orderResult.data!

    const itemRows: OrderItemRow[] = []
    for (const item of input.items) {
      const itemResult = await dbCreate<OrderItemRow>('order_items', {
        orderId: orderRow.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image ?? null,
      })
      itemRows.push(itemResult.data!)
    }

    // Record initial order event
    await dbCreate('order_events', {
      orderId: orderRow.id,
      status: 'pending',
      metadata: null,
    })

    logger.debug('Order created', { orderId: orderRow.id, userId })

    res.status(201).json(assembleOrder(orderRow, itemRows))
  } catch (error) {
    logger.error('Failed to create order', { userId, error })
    res.status(500).json({
      error: t('order.error.createFailed', undefined, { defaultValue: 'Failed to create order' }),
      errorKey: 'order.error.createFailed',
    })
  }
}
