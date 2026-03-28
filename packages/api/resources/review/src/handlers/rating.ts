/**
 * Average rating handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getAverageRating } from '../service.js'

/**
 * Returns aggregate rating statistics for a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function averageRating(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('review.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'review.error.missingResource',
    })
    return
  }

  try {
    const stats = await getAverageRating(resourceType, resourceId)
    res.json(stats)
  } catch (error) {
    logger.error('Failed to get average rating', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('review.error.ratingFailed', undefined, {
        defaultValue: 'Failed to get rating statistics',
      }),
      errorKey: 'review.error.ratingFailed',
    })
  }
}
