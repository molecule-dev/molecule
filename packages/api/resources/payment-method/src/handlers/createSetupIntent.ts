/**
 * `POST /me/payment-methods/setup-intent` — issue a SetupIntent for the
 * authenticated user so the frontend SDK can confirm a card off-session.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { createSetupIntent as createSetupIntentService } from '../service.js'

/**
 * Issues a SetupIntent for the authenticated user.
 *
 * @param _req - The request (no body required).
 * @param res - The response object.
 */
export async function createSetupIntent(
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
    const intent = await createSetupIntentService(userId)
    res.status(201).json(intent)
  } catch (error) {
    logger.error('Failed to create payment-method setup intent', { userId, error })
    res.status(500).json({
      error: t('paymentMethod.error.setupIntentFailed', undefined, {
        defaultValue: 'Failed to create setup intent',
      }),
      errorKey: 'paymentMethod.error.setupIntentFailed',
    })
  }
}
