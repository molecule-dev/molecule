/**
 * Activity feed handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getFeed } from '../service.js'

/**
 * Retrieves the paginated activity feed for the authenticated user.
 *
 * @param req - The request with optional query params for filtering and pagination.
 * @param res - The response object.
 */
export async function feed(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0
  const resourceType = req.query.resourceType as string | undefined
  const action = req.query.action as string | undefined

  try {
    const result = await getFeed(userId, { limit, offset, resourceType, action })
    res.json(result)
  } catch (error) {
    logger.error('Failed to get activity feed', { userId, error })
    res.status(500).json({
      error: t('activityFeed.error.feedFailed', undefined, {
        defaultValue: 'Failed to get activity feed',
      }),
      errorKey: 'activityFeed.error.feedFailed',
    })
  }
}
