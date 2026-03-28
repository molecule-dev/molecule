/**
 * List bookmark folders handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getFolders } from '../service.js'

/**
 * Lists all unique folder names for the current user's bookmarks.
 *
 * @param _req - The request (unused).
 * @param res - The response object.
 */
export async function folders(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  try {
    const result = await getFolders(userId)
    res.json({ folders: result })
  } catch (error) {
    logger.error('Failed to list bookmark folders', { userId, error })
    res.status(500).json({
      error: t('bookmark.error.foldersFailed', undefined, {
        defaultValue: 'Failed to list folders',
      }),
      errorKey: 'bookmark.error.foldersFailed',
    })
  }
}
