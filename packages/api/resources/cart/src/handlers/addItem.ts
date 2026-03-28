import { create as dbCreate, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { AddCartItemInput, CartItemRow, CartRow } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Adds an item to the authenticated user's cart. If the same product+variant already
 * exists, increments the quantity instead of creating a duplicate entry.
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

  if (!input.productId || !input.name || input.price == null || !input.quantity) {
    res.status(400).json({
      error: t('cart.error.itemRequired', undefined, {
        defaultValue: 'productId, name, price, and quantity are required',
      }),
      errorKey: 'cart.error.itemRequired',
    })
    return
  }

  if (input.quantity < 1) {
    res.status(400).json({
      error: t('cart.error.invalidQuantity', undefined, {
        defaultValue: 'Quantity must be at least 1',
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
