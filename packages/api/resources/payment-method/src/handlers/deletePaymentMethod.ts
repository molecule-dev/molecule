/**
 * `DELETE /me/payment-methods/:id` — detach + delete a saved payment method.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { type MoleculeRequest, type MoleculeResponse, respondError } from '@molecule/api-resource'

import { deletePaymentMethod as deleteService } from '../service.js'

/**
 * Detaches a saved payment method at the provider and removes it locally.
 *
 * @param req - The request with `:id` route param.
 * @param res - The response object.
 */
export async function deletePaymentMethod(
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
    const ok = await deleteService(id, userId)
    if (!ok) {
      res.status(404).json({
        error: t('paymentMethod.error.notFound', undefined, {
          defaultValue: 'Payment method not found',
        }),
        errorKey: 'paymentMethod.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    respondError(res, error, {
      status: 500,
      message: t('paymentMethod.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete payment method',
      }),
      errorKey: 'paymentMethod.error.deleteFailed',
    })
  }
}
