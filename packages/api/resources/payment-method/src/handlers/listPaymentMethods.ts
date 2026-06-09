/**
 * `GET /me/payment-methods` — list saved payment methods for the authenticated user.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { type MoleculeRequest, type MoleculeResponse, respondError } from '@molecule/api-resource'

import { listPaymentMethods as listPaymentMethodsService } from '../service.js'

/**
 * Returns every saved payment method for the authenticated user.
 *
 * @param _req - The request (no body required).
 * @param res - The response object.
 */
export async function listPaymentMethods(
  _req: MoleculeRequest,
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

  try {
    const methods = await listPaymentMethodsService(userId)
    res.json(methods)
  } catch (error) {
    respondError(res, error, {
      status: 500,
      message: t('paymentMethod.error.listFailed', undefined, {
        defaultValue: 'Failed to list payment methods',
      }),
      errorKey: 'paymentMethod.error.listFailed',
    })
  }
}
