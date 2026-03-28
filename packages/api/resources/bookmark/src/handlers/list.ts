/**
 * List bookmarks handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getBookmarks } from '../service.js'

/**
 * Lists the current user's bookmarks with optional filtering and pagination.
 *
 * @param req - The request with optional query params (resourceType, folder, limit, offset).
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const resourceType = req.query.resourceType as string | undefined
  const folder = req.query.folder as string | undefined
  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getBookmarks(userId, { resourceType, folder, limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list bookmarks', { userId, error })
    res.status(500).json({
      error: t('bookmark.error.listFailed', undefined, {
        defaultValue: 'Failed to list bookmarks',
      }),
      errorKey: 'bookmark.error.listFailed',
    })
  }
}
