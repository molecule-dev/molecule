/**
 * Read comment handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getCommentById } from '../service.js'

/**
 * Retrieves a single comment by ID.
 *
 * @param req - The request with `commentId` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { commentId } = req.params
  if (!commentId) {
    res.status(400).json({
      error: t('comment.error.missingId', undefined, { defaultValue: 'Comment ID is required' }),
      errorKey: 'comment.error.missingId',
    })
    return
  }

  try {
    const comment = await getCommentById(commentId)
    if (!comment) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(comment)
  } catch (error) {
    logger.error('Failed to read comment', { commentId, error })
    res.status(500).json({
      error: t('comment.error.readFailed', undefined, { defaultValue: 'Failed to read comment' }),
      errorKey: 'comment.error.readFailed',
    })
  }
}
