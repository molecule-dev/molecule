/**
 * Unsubscribe handler.
 *
 * POST /subscribers/unsubscribe/:token — opts a subscriber out via their
 * one-time unsubscribe token. Idempotent: re-posting an already-unsubscribed
 * token returns 200 with the existing record.
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
 * Unsubscribes a subscriber by token.
 *
 * @param req - Request with `:token` path parameter.
 * @param res - Response. On success returns the unsubscribed subscriber.
 */
export async function unsubscribe(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const token = req.params.token
  if (!token) {
    res.status(400).json({
      error: t('subscriber.error.tokenRequired', undefined, {
        defaultValue: 'Unsubscribe token is required',
      }),
      errorKey: 'subscriber.error.tokenRequired',
    })
    return
  }

  try {
    const row = await findOne<SubscriberRow>('subscribers', [
      { field: 'unsubscribeToken', operator: '=', value: token },
    ])

    if (!row) {
      res.status(404).json({
        error: t('subscriber.error.invalidToken', undefined, {
          defaultValue: 'Invalid or expired unsubscribe token',
        }),
        errorKey: 'subscriber.error.invalidToken',
      })
      return
    }

    if (row.status === 'unsubscribed') {
      res.status(200).json(toPublicSubscriber(row))
      return
    }

    const now = new Date().toISOString()
    await updateById('subscribers', row.id, {
      status: 'unsubscribed',
      unsubscribedAt: now,
      updatedAt: now,
    })

    logger.debug('Subscriber unsubscribed', { subscriberId: row.id })

    res.status(200).json(
      toPublicSubscriber({
        ...row,
        status: 'unsubscribed',
        unsubscribedAt: now,
        updatedAt: now,
      }),
    )
  } catch (error) {
    logger.error('Failed to unsubscribe subscriber', { error })
    res.status(500).json({
      error: t('subscriber.error.unsubscribeFailed', undefined, {
        defaultValue: 'Failed to unsubscribe',
      }),
      errorKey: 'subscriber.error.unsubscribeFailed',
    })
  }
}
