import { create as dbCreate, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CartItemRow, CartRow } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Returns the authenticated user's cart. Creates an empty cart if none exists.
 * @param _req - The request object (unused — cart is identified by session user).
 * @param res - The response object.
 */
export async function getCart(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('cart.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'cart.error.unauthorized',
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

    const itemRows = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'cartId', operator: '=', value: cartRow.id }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    res.json(assembleCart(cartRow, itemRows))
  } catch (error) {
    logger.error('Failed to get cart', { userId, error })
    res.status(500).json({
      error: t('cart.error.getFailed', undefined, { defaultValue: 'Failed to get cart' }),
      errorKey: 'cart.error.getFailed',
    })
  }
}
