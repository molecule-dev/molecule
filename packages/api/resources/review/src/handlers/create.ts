/**
 * Create review handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { createReview } from '../service.js'
import { createReviewSchema } from '../validation.js'

/**
 * Creates a new review on a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params and review body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

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

  const parsed = createReviewSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'review.error.validationFailed' })
    return
  }

  try {
    const review = await createReview(resourceType, resourceId, userId, parsed.data)
    res.status(201).json(review)
  } catch (error) {
    logger.error('Failed to create review', { resourceType, resourceId, userId, error })
    res.status(500).json({
      error: t('review.error.createFailed', undefined, {
        defaultValue: 'Failed to create review',
      }),
      errorKey: 'review.error.createFailed',
    })
  }
}
