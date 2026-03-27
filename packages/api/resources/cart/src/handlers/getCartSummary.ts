import { findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CartItemRow, CartRow, CartSummary } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Returns a lightweight summary of the user's cart (item count, totals).
 * @param _req - The request object (unused).
 * @param res - The response object.
 */
export async function getCartSummary(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
      const summary: CartSummary = { itemCount: 0, uniqueItems: 0, subtotal: 0, total: 0 }
      res.json(summary)
      return
    }

    const itemRows = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'cartId', operator: '=', value: cartRow.id }],
    })

    const cart = assembleCart(cartRow, itemRows)

    const summary: CartSummary = {
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueItems: cart.items.length,
      subtotal: cart.subtotal,
      total: cart.total,
    }

    res.json(summary)
  } catch (error) {
    logger.error('Failed to get cart summary', { userId, error })
    res.status(500).json({
      error: t('cart.error.summaryFailed', undefined, {
        defaultValue: 'Failed to get cart summary',
      }),
      errorKey: 'cart.error.summaryFailed',
    })
  }
}
