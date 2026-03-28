import { deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CartItemRow, CartRow } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Removes an item from the user's cart by item ID.
 * @param req - The request with `itemId` route parameter.
 * @param res - The response object.
 */
export async function removeItem(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('cart.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'cart.error.unauthorized',
    })
    return
  }

  const itemId = req.params.itemId as string

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

    await deleteById('cart_items', itemId)
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
    logger.error('Failed to remove cart item', { userId, itemId, error })
    res.status(500).json({
      error: t('cart.error.removeItemFailed', undefined, {
        defaultValue: 'Failed to remove item from cart',
      }),
      errorKey: 'cart.error.removeItemFailed',
    })
  }
}
