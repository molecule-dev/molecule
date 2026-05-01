/**
 * Confirm handler.
 *
 * GET /subscribers/confirm/:token — confirms a pending subscriber by their
 * one-time confirm token. Idempotent for already-confirmed records: a second
 * GET with the same token returns the same subscriber without re-issuing the
 * `confirmedAt` timestamp.
 *
 * @module
 */

import { findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { SubscriberRow } from '../types.js'
import { toPublicSubscriber } from '../utilities.js'

/**
 * Confirms a subscriber by token.
 *
 * @param req - Request with `:token` path parameter.
 * @param res - Response. On success returns the confirmed subscriber (no token).
 */
export async function confirm(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const token = req.params.token
  if (!token) {
    res.status(400).json({
      error: t('subscriber.error.tokenRequired', undefined, {
        defaultValue: 'Confirmation token is required',
      }),
      errorKey: 'subscriber.error.tokenRequired',
    })
    return
  }

  try {
    const row = await findOne<SubscriberRow>('subscribers', [
      { field: 'confirmToken', operator: '=', value: token },
    ])

    if (!row) {
      res.status(404).json({
        error: t('subscriber.error.invalidToken', undefined, {
          defaultValue: 'Invalid or expired confirmation token',
        }),
        errorKey: 'subscriber.error.invalidToken',
      })
      return
    }

    if (row.status === 'unsubscribed') {
      res.status(409).json({
        error: t('subscriber.error.alreadyUnsubscribed', undefined, {
          defaultValue: 'This subscription has been unsubscribed',
        }),
        errorKey: 'subscriber.error.alreadyUnsubscribed',
      })
      return
    }

    if (row.status === 'confirmed') {
      res.status(200).json(toPublicSubscriber(row))
      return
    }

    const now = new Date().toISOString()
    await updateById('subscribers', row.id, {
      status: 'confirmed',
      confirmedAt: now,
      updatedAt: now,
    })

    logger.debug('Subscriber confirmed', { subscriberId: row.id })

    res.status(200).json(
      toPublicSubscriber({
        ...row,
        status: 'confirmed',
        confirmedAt: now,
        updatedAt: now,
      }),
    )
  } catch (error) {
    logger.error('Failed to confirm subscriber', { error })
    res.status(500).json({
      error: t('subscriber.error.confirmFailed', undefined, {
        defaultValue: 'Failed to confirm subscriber',
      }),
      errorKey: 'subscriber.error.confirmFailed',
    })
  }
}
