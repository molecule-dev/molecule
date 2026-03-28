/**
 * Delete comment handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { deleteComment } from '../service.js'

/**
 * Deletes a comment. Only the comment owner can delete.
 *
 * @param req - The request with `commentId` param.
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

  const { commentId } = req.params
  if (!commentId) {
    res.status(400).json({
      error: t('comment.error.missingId', undefined, { defaultValue: 'Comment ID is required' }),
      errorKey: 'comment.error.missingId',
    })
    return
  }

  try {
    const deleted = await deleteComment(commentId, userId)
    if (!deleted) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete comment', { commentId, userId, error })
    res.status(500).json({
      error: t('comment.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete comment',
      }),
      errorKey: 'comment.error.deleteFailed',
    })
  }
}
