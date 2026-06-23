import { create as dbCreate, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { AddCartItemInput, CartItemRow, CartRow } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Adds an item to the authenticated user's cart. If the same product+variant already
 * exists, increments the quantity instead of creating a duplicate entry.
 *
 * ⚠️ CLIENT-PRICE TRUST BOUNDARY ⚠️ — the stored `price` comes verbatim from
 * the request body. This resource is GENERIC (no product/catalog table), so it
 * CANNOT verify the price; the validation below only rejects malformed money
 * (negative price, non-integer/zero quantity). NEVER charge a customer off a
 * cart-item `price`: at checkout, re-resolve every unit price SERVER-SIDE from
 * the product/menu table (keyed by `productId`/`variantId`) and recompute
 * totals from those trusted values, ignoring the client-supplied `price`.
 *
 * @param req - The request with {@link AddCartItemInput} body.
 * @param res - The response object.
 */
export async function addItem(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('cart.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'cart.error.unauthorized',
    })
    return
  }

  const input = req.body as AddCartItemInput

  if (!input.productId || !input.name || input.price == null || input.quantity == null) {
    res.status(400).json({
      error: t('cart.error.itemRequired', undefined, {
        defaultValue: 'productId, name, price, and quantity are required',
      }),
      errorKey: 'cart.error.itemRequired',
    })
    return
  }

  // Reject a negative/non-finite unit price (malformed money). This does NOT
  // verify the price is CORRECT — see the trust-boundary note above.
  if (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price < 0) {
    res.status(400).json({
      error: t('cart.error.invalidPrice', undefined, {
        defaultValue: 'Price must be a non-negative number',
      }),
      errorKey: 'cart.error.invalidPrice',
    })
    return
  }

  if (
    typeof input.quantity !== 'number' ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1
  ) {
    res.status(400).json({
      error: t('cart.error.invalidQuantity', undefined, {
        defaultValue: 'Quantity must be an integer of at least 1',
      }),
      errorKey: 'cart.error.invalidQuantity',
    })
    return
  }

  try {
    let cartRow = await findOne<CartRow>('carts', [
      { field: 'userId', operator: '=', value: userId },
    ])
    if (!cartRow) {
      const result = await dbCreate<CartRow>('carts', { userId })
      cartRow = result.data!
    }

    // Check for existing item with same product+variant
    const existing = input.variantId
      ? await findOne<CartItemRow>('cart_items', [
          { field: 'cartId', operator: '=', value: cartRow.id },
          { field: 'productId', operator: '=', value: input.productId },
          { field: 'variantId', operator: '=', value: input.variantId },
        ])
      : await findOne<CartItemRow>('cart_items', [
          { field: 'cartId', operator: '=', value: cartRow.id },
          { field: 'productId', operator: '=', value: input.productId },
        ])

    if (existing) {
      await updateById('cart_items', existing.id, {
        quantity: existing.quantity + input.quantity,
      })
    } else {
      await dbCreate('cart_items', {
        cartId: cartRow.id,
        productId: input.productId,
        variantId: input.variantId ?? null,
        name: input.name,
        price: input.price,
        quantity: input.quantity,
        image: input.image ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })
    }

    await updateById('carts', cartRow.id, { updatedAt: new Date().toISOString() })

    const itemRows = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'cartId', operator: '=', value: cartRow.id }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    // Re-read cart row for updated timestamp
    const updatedCartRow = (await findOne<CartRow>('carts', [
      { field: 'id', operator: '=', value: cartRow.id },
    ]))!

    res.status(201).json(assembleCart(updatedCartRow, itemRows))
  } catch (error) {
    logger.error('Failed to add item to cart', { userId, error })
    res.status(500).json({
      error: t('cart.error.addItemFailed', undefined, {
        defaultValue: 'Failed to add item to cart',
      }),
      errorKey: 'cart.error.addItemFailed',
    })
  }
}
