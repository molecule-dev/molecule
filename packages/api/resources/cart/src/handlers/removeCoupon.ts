import { findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CartItemRow, CartRow } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Removes the currently applied coupon from the user's cart.
 * @param _req - The request object (unused).
 * @param res - The response object.
 */
export async function removeCoupon(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
      res.status(404).json({
        error: t('cart.error.notFound', undefined, { defaultValue: 'Cart not found' }),
        errorKey: 'cart.error.notFound',
      })
      return
    }

    await updateById('carts', cartRow.id, {
      coupon: null,
      updatedAt: new Date().toISOString(),
    })

    const itemRows = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'cartId', operator: '=', value: cartRow.id }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    const updatedCartRow = (await findOne<CartRow>('carts', [
      { field: 'id', operator: '=', value: cartRow.id },
    ]))!

    logger.debug('Coupon removed', { userId, cartId: cartRow.id })
    res.json(assembleCart(updatedCartRow, itemRows))
  } catch (error) {
    logger.error('Failed to remove coupon', { userId, error })
    res.status(500).json({
      error: t('cart.error.removeCouponFailed', undefined, {
        defaultValue: 'Failed to remove coupon',
      }),
      errorKey: 'cart.error.removeCouponFailed',
    })
  }
}
