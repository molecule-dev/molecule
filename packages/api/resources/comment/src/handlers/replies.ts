/**
 * List comment replies handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getReplies } from '../service.js'

/**
 * Lists paginated replies to a comment.
 *
 * @param req - The request with `commentId` param.
 * @param res - The response object.
 */
export async function replies(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { commentId } = req.params
  if (!commentId) {
    res.status(400).json({
      error: t('comment.error.missingId', undefined, { defaultValue: 'Comment ID is required' }),
      errorKey: 'comment.error.missingId',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getReplies(commentId, { limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list replies', { commentId, error })
    res.status(500).json({
      error: t('comment.error.repliesFailed', undefined, {
        defaultValue: 'Failed to list replies',
      }),
      errorKey: 'comment.error.repliesFailed',
    })
  }
}
