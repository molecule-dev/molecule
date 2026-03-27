import { deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CartItemRow, CartRow } from '../types.js'

/**
 * Removes all items and the applied coupon from the user's cart.
 * @param _req - The request object (unused).
 * @param res - The response object.
 */
export async function clearCart(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('cart.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'cart.error.unauthorized',
    })
    return
  }

  try {
    const cartRow = await findOne<CartRow>('carts', [
      { field: 'userId', operator: '=', value: userId },
    ])
    if (!cartRow) {
      res.status(204).end()
      return
    }

    const items = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'cartId', operator: '=', value: cartRow.id }],
    })

    for (const item of items) {
      await deleteById('cart_items', item.id)
    }

    await updateById('carts', cartRow.id, {
      coupon: null,
      updatedAt: new Date().toISOString(),
    })

    logger.debug('Cart cleared', { userId, cartId: cartRow.id })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to clear cart', { userId, error })
    res.status(500).json({
      error: t('cart.error.clearFailed', undefined, { defaultValue: 'Failed to clear cart' }),
      errorKey: 'cart.error.clearFailed',
    })
  }
}
