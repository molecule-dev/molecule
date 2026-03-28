/**
 * Delete review handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { deleteReview } from '../service.js'

/**
 * Deletes a review. Only the review owner can delete.
 *
 * @param req - The request with `reviewId` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    const deleted = await deleteReview(reviewId, userId)
    if (!deleted) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete review', { reviewId, userId, error })
    res.status(500).json({
      error: t('review.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete review',
      }),
      errorKey: 'review.error.deleteFailed',
    })
  }
}
