import { create as dbCreate, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { ApplyCouponInput, CartItemRow, CartRow } from '../types.js'
import { assembleCart } from '../utilities.js'

/**
 * Applies a coupon code to the user's cart. The coupon is validated by looking
 * it up in the `coupons` table. Replaces any previously applied coupon.
 * @param req - The request with {@link ApplyCouponInput} body.
 * @param res - The response object.
 */
export async function applyCoupon(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('cart.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'cart.error.unauthorized',
    })
    return
  }

  const input = req.body as ApplyCouponInput
  if (!input.code) {
    res.status(400).json({
      error: t('cart.error.couponCodeRequired', undefined, {
        defaultValue: 'Coupon code is required',
      }),
      errorKey: 'cart.error.couponCodeRequired',
    })
    return
  }

  try {
    // Look up coupon in database
    const couponRecord = await findOne<{
      id: string
      code: string
      type: 'percentage' | 'fixed'
      value: number
      active: boolean
    }>('coupons', [
      { field: 'code', operator: '=', value: input.code },
      { field: 'active', operator: '=', value: true },
    ])

    if (!couponRecord) {
      res.status(404).json({
        error: t('cart.error.couponNotFound', undefined, {
          defaultValue: 'Coupon not found or inactive',
        }),
        errorKey: 'cart.error.couponNotFound',
      })
      return
    }

    let cartRow = await findOne<CartRow>('carts', [
      { field: 'userId', operator: '=', value: userId },
    ])
    if (!cartRow) {
      const result = await dbCreate<CartRow>('carts', { userId })
      cartRow = result.data!
    }

    const couponData = JSON.stringify({
      code: couponRecord.code,
      type: couponRecord.type,
      value: couponRecord.value,
    })

    await updateById('carts', cartRow.id, {
      coupon: couponData,
      updatedAt: new Date().toISOString(),
    })

    const itemRows = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'cartId', operator: '=', value: cartRow.id }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    const updatedCartRow = (await findOne<CartRow>('carts', [
      { field: 'id', operator: '=', value: cartRow.id },
    ]))!

    logger.debug('Coupon applied', { userId, code: input.code })
    res.json(assembleCart(updatedCartRow, itemRows))
  } catch (error) {
    logger.error('Failed to apply coupon', { userId, code: input.code, error })
    res.status(500).json({
      error: t('cart.error.applyCouponFailed', undefined, {
        defaultValue: 'Failed to apply coupon',
      }),
      errorKey: 'cart.error.applyCouponFailed',
    })
  }
}
