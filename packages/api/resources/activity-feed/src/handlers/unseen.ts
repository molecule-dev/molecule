/**
 * Unseen activity count handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getUnseenCount } from '../service.js'

/**
 * Returns the number of unseen activities for the authenticated user.
 *
 * @param _req - The request object (unused).
 * @param res - The response object.
 */
export async function unseen(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  try {
    const unseenCount = await getUnseenCount(userId)
    res.json({ count: unseenCount })
  } catch (error) {
    logger.error('Failed to get unseen count', { userId, error })
    res.status(500).json({
      error: t('activityFeed.error.unseenFailed', undefined, {
        defaultValue: 'Failed to get unseen count',
      }),
      errorKey: 'activityFeed.error.unseenFailed',
    })
  }
}
