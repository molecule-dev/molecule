/**
 * Mark review as helpful handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { markHelpful } from '../service.js'

/**
 * Marks a review as helpful. Idempotent — duplicate votes are silently ignored.
 *
 * @param req - The request with `reviewId` param.
 * @param res - The response object.
 */
export async function helpful(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { reviewId } = req.params
  if (!reviewId) {
    res.status(400).json({
      error: t('review.error.missingId', undefined, { defaultValue: 'Review ID is required' }),
      errorKey: 'review.error.missingId',
    })
    return
  }

  try {
    await markHelpful(reviewId, userId)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to mark review helpful', { reviewId, userId, error })
    res.status(500).json({
      error: t('review.error.helpfulFailed', undefined, {
        defaultValue: 'Failed to mark review as helpful',
      }),
      errorKey: 'review.error.helpfulFailed',
    })
  }
}
