/**
 * Create comment handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { createComment } from '../service.js'
import { createCommentSchema } from '../validation.js'

/**
 * Creates a new comment on a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params and comment body.
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
      error: t('comment.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'comment.error.missingResource',
    })
    return
  }

  const parsed = createCommentSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'comment.error.validationFailed' })
    return
  }

  try {
    const comment = await createComment(resourceType, resourceId, userId, parsed.data)
    res.status(201).json(comment)
  } catch (error) {
    logger.error('Failed to create comment', { resourceType, resourceId, userId, error })
    res.status(500).json({
      error: t('comment.error.createFailed', undefined, {
        defaultValue: 'Failed to create comment',
      }),
      errorKey: 'comment.error.createFailed',
    })
  }
}
