/**
 * `PUT /me/payment-methods/:id/default` — mark a saved payment method as the default.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { type MoleculeRequest, type MoleculeResponse, respondError } from '@molecule/api-resource'

import { setDefaultPaymentMethod as setDefaultService } from '../service.js'

/**
 * Promotes a saved payment method to default. Enforces ownership via the
 * service layer.
 *
 * @param req - The request with `:id` route param.
 * @param res - The response object.
 */
export async function setDefaultPaymentMethod(
  req: MoleculeRequest,
  res: MoleculeResponse,
): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('paymentMethod.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'paymentMethod.error.unauthorized',
    })
    return
  }

  const id = req.params?.id
  if (!id) {
    res.status(400).json({
      error: t('paymentMethod.error.idRequired', undefined, {
        defaultValue: 'Payment method id is required',
      }),
      errorKey: 'paymentMethod.error.idRequired',
    })
    return
  }

  try {
    const updated = await setDefaultService(userId, id)
    if (!updated) {
      res.status(404).json({
        error: t('paymentMethod.error.notFound', undefined, {
          defaultValue: 'Payment method not found',
        }),
        errorKey: 'paymentMethod.error.notFound',
      })
      return
    }
    res.json(updated)
  } catch (error) {
    respondError(res, error, {
      status: 500,
      message: t('paymentMethod.error.setDefaultFailed', undefined, {
        defaultValue: 'Failed to set default payment method',
      }),
      errorKey: 'paymentMethod.error.setDefaultFailed',
    })
  }
}
