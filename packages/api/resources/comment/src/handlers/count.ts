/**
 * Comment count handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getCommentCount } from '../service.js'

/**
 * Returns the total comment count for a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function commentCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  try {
    const total = await getCommentCount(resourceType, resourceId)
    res.json({ count: total })
  } catch (error) {
    logger.error('Failed to count comments', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('comment.error.countFailed', undefined, {
        defaultValue: 'Failed to count comments',
      }),
      errorKey: 'comment.error.countFailed',
    })
  }
}
