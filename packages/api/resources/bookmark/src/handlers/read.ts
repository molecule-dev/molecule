/**
 * Check bookmark handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isBookmarked } from '../service.js'

/**
 * Checks whether the current user has bookmarked a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function check(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    const bookmarked = await isBookmarked(userId, resourceType, resourceId)
    res.json({ bookmarked })
  } catch (error) {
    logger.error('Failed to check bookmark', { userId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('bookmark.error.checkFailed', undefined, {
        defaultValue: 'Failed to check bookmark',
      }),
      errorKey: 'bookmark.error.checkFailed',
    })
  }
}
