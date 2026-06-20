/**
 * Resource timeline handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getTimeline } from '../service.js'

/**
 * Retrieves the paginated activity timeline for a specific resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function timeline(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // [M6-1] The route declares `authenticate`, but the scaffolder strips bare middleware
  // that isn't a handler-map key, so this handler must fail closed in-handler like its
  // siblings — otherwise an anonymous caller can read any resource's activity log.
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'auth.unauthorized',
    })
    return
  }

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('activityFeed.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'activityFeed.error.missingResource',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getTimeline(resourceType, resourceId, { limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to get timeline', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('activityFeed.error.timelineFailed', undefined, {
        defaultValue: 'Failed to get timeline',
      }),
      errorKey: 'activityFeed.error.timelineFailed',
    })
  }
}
