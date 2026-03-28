/**
 * Get following list handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getFollowing } from '../service.js'

/**
 * Lists targets the current user is following.
 *
 * @param req - The request with pagination query params.
 * @param res - The response object.
 */
export async function following(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  try {
    const result = await getFollowing(userId, { limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list following', { userId, error })
    res.status(500).json({
      error: t('follow.error.followingFailed', undefined, {
        defaultValue: 'Failed to list following',
      }),
      errorKey: 'follow.error.followingFailed',
    })
  }
}
