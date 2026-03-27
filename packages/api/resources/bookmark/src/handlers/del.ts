/**
 * Remove bookmark handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { removeBookmark } from '../service.js'

/**
 * Removes a bookmark by resource type and ID.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
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

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('bookmark.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'bookmark.error.missingResource',
    })
    return
  }

  try {
    await removeBookmark(userId, resourceType, resourceId)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to remove bookmark', { userId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('bookmark.error.deleteFailed', undefined, {
        defaultValue: 'Failed to remove bookmark',
      }),
      errorKey: 'bookmark.error.deleteFailed',
    })
  }
}
