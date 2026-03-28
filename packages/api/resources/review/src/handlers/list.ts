/**
 * List reviews handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getReviewsByResource } from '../service.js'
import type { ReviewQuery } from '../types.js'

const VALID_SORT_FIELDS = ['createdAt', 'rating', 'helpful'] as const
const VALID_SORT_DIRECTIONS = ['asc', 'desc'] as const

/**
 * Lists paginated reviews for a resource with optional sorting.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0

  const options: ReviewQuery = { limit, offset }

  const sortBy = req.query.sortBy as string | undefined
  if (sortBy && VALID_SORT_FIELDS.includes(sortBy as ReviewQuery['sortBy'] & string)) {
    options.sortBy = sortBy as ReviewQuery['sortBy']
  }

  const sortDirection = req.query.sortDirection as string | undefined
  if (
    sortDirection &&
    VALID_SORT_DIRECTIONS.includes(sortDirection as ReviewQuery['sortDirection'] & string)
  ) {
    options.sortDirection = sortDirection as ReviewQuery['sortDirection']
  }

  try {
    const result = await getReviewsByResource(resourceType, resourceId, options)
    res.json(result)
  } catch (error) {
    logger.error('Failed to list reviews', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('review.error.listFailed', undefined, {
        defaultValue: 'Failed to list reviews',
      }),
      errorKey: 'review.error.listFailed',
    })
  }
}
