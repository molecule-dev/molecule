/**
 * Read subscriber handler.
 *
 * GET /subscribers/:id — returns a single subscriber by id. Tokens are stripped.
 *
 * @module
 */

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { SubscriberRow } from '../types.js'
import { toPublicSubscriber } from '../utilities.js'

/**
 * Reads a single subscriber by id.
 *
 * @param req - Request with `:id` path parameter.
 * @param res - Response.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id
  if (!id) {
    res.status(400).json({
      error: t('subscriber.error.idRequired', undefined, {
        defaultValue: 'Subscriber id is required',
      }),
      errorKey: 'subscriber.error.idRequired',
    })
    return
  }

  try {
    const row = await findById<SubscriberRow>('subscribers', id)
    if (!row) {
      res.status(404).json({
        error: t('subscriber.error.notFound', undefined, {
          defaultValue: 'Subscriber not found',
        }),
        errorKey: 'subscriber.error.notFound',
      })
      return
    }

    res.status(200).json(toPublicSubscriber(row))
  } catch (error) {
    logger.error('Failed to read subscriber', { error, id })
    res.status(500).json({
      error: t('subscriber.error.readFailed', undefined, {
        defaultValue: 'Failed to read subscriber',
      }),
      errorKey: 'subscriber.error.readFailed',
    })
  }
}
