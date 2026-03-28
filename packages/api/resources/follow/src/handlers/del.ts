/**
 * Unfollow handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { unfollow } from '../service.js'

/**
 * Removes a follow relationship.
 *
 * @param req - The request with `targetType` and `targetId` params.
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
    await unfollow(userId, targetType, targetId)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to unfollow', { userId, targetType, targetId, error })
    res.status(500).json({
      error: t('follow.error.deleteFailed', undefined, { defaultValue: 'Failed to unfollow' }),
      errorKey: 'follow.error.deleteFailed',
    })
  }
}
