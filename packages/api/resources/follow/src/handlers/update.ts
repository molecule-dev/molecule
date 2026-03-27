/**
 * Check follow status handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isFollowing } from '../service.js'

/**
 * Checks if the current user is following a target.
 *
 * @param req - The request with `targetType` and `targetId` params.
 * @param res - The response object.
 */
export async function checkFollowing(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { targetType, targetId } = req.params
  if (!targetType || !targetId) {
    res.status(400).json({
      error: t('follow.error.missingTarget', undefined, {
        defaultValue: 'Target type and ID are required',
      }),
      errorKey: 'follow.error.missingTarget',
    })
    return
  }

  try {
    const result = await isFollowing(userId, targetType, targetId)
    res.json({ following: result })
  } catch (error) {
    logger.error('Failed to check follow status', { userId, targetType, targetId, error })
    res.status(500).json({
      error: t('follow.error.checkFailed', undefined, {
        defaultValue: 'Failed to check follow status',
      }),
      errorKey: 'follow.error.checkFailed',
    })
  }
}
