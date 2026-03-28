import { findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CartItemRow, CartRow, UpdateCartItemInput } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Updates the quantity of a specific item in the user's cart.
 * @param req - The request with `itemId` param and {@link UpdateCartItemInput} body.
 * @param res - The response object.
 */
export async function updateQuantity(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('cart.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'cart.error.unauthorized',
    })
    return
  }

  const itemId = req.params.itemId as string
  const input = req.body as UpdateCartItemInput

  if (input.quantity == null || input.quantity < 1) {
    res.status(400).json({
      error: t('cart.error.invalidQuantity', undefined, {
        defaultValue: 'Quantity must be at least 1',
      }),
      errorKey: 'cart.error.invalidQuantity',
    })
    return
  }

  try {
    const cartRow = await findOne<CartRow>('carts', [
      { field: 'userId', operator: '=', value: userId },
    ])
    if (!cartRow) {
      res.status(404).json({
        error: t('cart.error.notFound', undefined, { defaultValue: 'Cart not found' }),
        errorKey: 'cart.error.notFound',
      })
      return
    }

    const item = await findById<CartItemRow>('cart_items', itemId)
    if (!item || item.cartId !== cartRow.id) {
      res.status(404).json({
        error: t('cart.error.itemNotFound', undefined, { defaultValue: 'Cart item not found' }),
        errorKey: 'cart.error.itemNotFound',
      })
      return
    }

    await updateById('cart_items', itemId, { quantity: input.quantity })
    await updateById('carts', cartRow.id, { updatedAt: new Date().toISOString() })

    const itemRows = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'cartId', operator: '=', value: cartRow.id }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    const updatedCartRow = (await findOne<CartRow>('carts', [
      { field: 'id', operator: '=', value: cartRow.id },
    ]))!

    res.json(assembleCart(updatedCartRow, itemRows))
  } catch (error) {
    logger.error('Failed to update cart item quantity', { userId, itemId, error })
    res.status(500).json({
      error: t('cart.error.updateFailed', undefined, {
        defaultValue: 'Failed to update cart item',
      }),
      errorKey: 'cart.error.updateFailed',
    })
  }
}
