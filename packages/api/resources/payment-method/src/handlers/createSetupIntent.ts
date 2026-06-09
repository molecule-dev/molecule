/**
 * `POST /me/payment-methods/setup-intent` — issue a SetupIntent for the
 * authenticated user so the frontend SDK can confirm a card off-session.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { type MoleculeRequest, type MoleculeResponse, respondError } from '@molecule/api-resource'

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
    // A tagged provider error (e.g. missing STRIPE_SECRET_KEY → 503 + 'config.notConfigured')
    // surfaces its real status/errorKey; anything else falls back to the generic 500.
    respondError(res, error, {
      status: 500,
      message: t('paymentMethod.error.setupIntentFailed', undefined, {
        defaultValue: 'Failed to create setup intent',
      }),
      errorKey: 'paymentMethod.error.setupIntentFailed',
    })
  }
}
