/**
 * Update review handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { updateReview } from '../service.js'
import { updateReviewSchema } from '../validation.js'

/**
 * Updates an existing review. Only the review owner can update.
 *
 * @param req - The request with `reviewId` param and update body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const parsed = updateReviewSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'review.error.validationFailed' })
    return
  }

  try {
    const review = await updateReview(reviewId, userId, parsed.data)
    if (!review) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(review)
  } catch (error) {
    logger.error('Failed to update review', { reviewId, userId, error })
    res.status(500).json({
      error: t('review.error.updateFailed', undefined, {
        defaultValue: 'Failed to update review',
      }),
      errorKey: 'review.error.updateFailed',
    })
  }
}
