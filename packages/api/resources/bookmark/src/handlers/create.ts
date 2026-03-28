/**
 * Add bookmark handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { addBookmark } from '../service.js'
import { createBookmarkSchema } from '../validation.js'

/**
 * Adds a bookmark for the current user. Idempotent.
 *
 * @param req - The request with bookmark body (resourceType, resourceId, folder?).
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

  const parsed = createBookmarkSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'bookmark.error.validationFailed' })
    return
  }

  try {
    const bookmark = await addBookmark(
      userId,
      parsed.data.resourceType,
      parsed.data.resourceId,
      parsed.data.folder,
    )
    res.status(201).json(bookmark)
  } catch (error) {
    logger.error('Failed to add bookmark', { userId, error })
    res.status(500).json({
      error: t('bookmark.error.createFailed', undefined, {
        defaultValue: 'Failed to add bookmark',
      }),
      errorKey: 'bookmark.error.createFailed',
    })
  }
}
