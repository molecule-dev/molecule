/**
 * Read subscriber handler.
 *
 * GET /subscribers/:id — returns a single subscriber by id. Tokens are stripped.
 *
 * Admin-only: exposes subscriber PII, so it rejects non-admin callers (401 when
 * unauthenticated, 403 otherwise) before reading any data — defense-in-depth that
 * does not depend on the `requireAdmin` route middleware being wired.
 *
 * @module
 */

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isSubscriberAdmin } from '../authorizers/index.js'
import type { SubscriberRow } from '../types.js'
import { toPublicSubscriber } from '../utilities.js'

/**
 * Reads a single subscriber by id.
 *
 * @param req - Request with `:id` path parameter.
 * @param res - Response.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }
  if (!(await isSubscriberAdmin(res))) {
    res.status(403).json({
      error: t('subscriber.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage subscribers',
      }),
      errorKey: 'subscriber.error.forbidden',
    })
    return
  }

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
