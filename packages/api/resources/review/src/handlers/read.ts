/**
 * Read review handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getReviewById } from '../service.js'

/**
 * Retrieves a single review by ID.
 *
 * @param req - The request with `reviewId` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { reviewId } = req.params
  if (!reviewId) {
    res.status(400).json({
      error: t('review.error.missingId', undefined, { defaultValue: 'Review ID is required' }),
      errorKey: 'review.error.missingId',
    })
    return
  }

  try {
    const review = await getReviewById(reviewId)
    if (!review) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(review)
  } catch (error) {
    logger.error('Failed to read review', { reviewId, error })
    res.status(500).json({
      error: t('review.error.readFailed', undefined, { defaultValue: 'Failed to read review' }),
      errorKey: 'review.error.readFailed',
    })
  }
}
