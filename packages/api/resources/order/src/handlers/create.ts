import { create as dbCreate } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateOrderInput, OrderItemRow, OrderRow } from '../types.js'
import { assembleOrder, computeSubtotal } from '../utilities.js'

/**
 * Creates a new order from the request body.
 *
 * ⚠️ CLIENT-PRICE TRUST BOUNDARY — READ BEFORE WIRING TO PAYMENTS ⚠️
 *
 * This handler TRUSTS the client-supplied money fields verbatim:
 * `items[].price`, `items[].quantity`, `discount`, `tax`, and `shipping` all
 * come straight from the request body, and the order `total` is computed from
 * them (`subtotal − discount + tax + shipping`). This resource is GENERIC — it
 * owns no product/catalog table — so it CANNOT and DOES NOT verify a client
 * price against a real unit price. The validation below only rejects malformed
 * money (negative amounts, non-integer/zero quantities); it does NOT establish
 * that the prices are correct.
 *
 * Therefore `create()` MUST NOT be wired directly to a payment-charging path.
 * A caller that charges off this order's `total` lets a malicious client set
 * their own prices (e.g. `price: 0` or a negative `discount` that zeroes the
 * total). Charging code MUST resolve each unit price SERVER-SIDE from the
 * product/menu table (keyed by `productId`/`variantId`), ignore the client's
 * `price`, and recompute `subtotal`/`tax`/`shipping`/`total` from those
 * trusted values — exactly as every flagship checkout flow does. Use this
 * handler only for non-charging flows (drafts, internal/admin order entry,
 * an already-server-priced order), or replace it with an app-specific create
 * that does the server-side price lookup.
 *
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
    // Reject malformed money: a missing productId/name, a missing/negative
    // unit price, or a quantity that is not a positive integer. (This does NOT
    // verify the price is CORRECT — see the trust-boundary note above.)
    if (
      !item.productId ||
      !item.name ||
      typeof item.price !== 'number' ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      res.status(400).json({
        error: t('order.error.invalidItem', undefined, {
          defaultValue:
            'Each item must have productId, name, a non-negative price, and an integer quantity >= 1',
        }),
        errorKey: 'order.error.invalidItem',
      })
      return
    }
  }

  // Reject negative discount/tax/shipping. A negative value could drive the
  // total below 0 (a credit) — e.g. a negative discount ADDS to the total while
  // a negative tax/shipping SUBTRACTS from it.
  const discount = input.discount ?? 0
  const tax = input.tax ?? 0
  const shipping = input.shipping ?? 0
  if (
    !Number.isFinite(discount) ||
    discount < 0 ||
    !Number.isFinite(tax) ||
    tax < 0 ||
    !Number.isFinite(shipping) ||
    shipping < 0
  ) {
    res.status(400).json({
      error: t('order.error.invalidAmounts', undefined, {
        defaultValue: 'discount, tax, and shipping must be non-negative',
      }),
      errorKey: 'order.error.invalidAmounts',
    })
    return
  }

  try {
    const subtotal = computeSubtotal(input.items)
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
