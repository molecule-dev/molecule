/**
 * Update comment handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { updateComment } from '../service.js'
import { updateCommentSchema } from '../validation.js'

/**
 * Updates an existing comment. Only the comment owner can update.
 *
 * @param req - The request with `commentId` param and update body.
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

  const { commentId } = req.params
  if (!commentId) {
    res.status(400).json({
      error: t('comment.error.missingId', undefined, { defaultValue: 'Comment ID is required' }),
      errorKey: 'comment.error.missingId',
    })
    return
  }

  const parsed = updateCommentSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'comment.error.validationFailed' })
    return
  }

  try {
    const comment = await updateComment(commentId, userId, parsed.data)
    if (!comment) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(comment)
  } catch (error) {
    logger.error('Failed to update comment', { commentId, userId, error })
    res.status(500).json({
      error: t('comment.error.updateFailed', undefined, {
        defaultValue: 'Failed to update comment',
      }),
      errorKey: 'comment.error.updateFailed',
    })
  }
}
