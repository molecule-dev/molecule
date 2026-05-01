/**
 * Total unread count across all the authenticated user's threads.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getTotalUnreadCount } from '../service.js'

/**
 * Returns the authenticated user's total unread message count.
 *
 * @param req - The request.
 * @param res - The response object.
 */
export async function unreadCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  try {
    const total = await getTotalUnreadCount(userId)
    res.json({ unreadCount: total })
  } catch (error) {
    logger.error('Failed to get unread count', { userId, error })
    res.status(500).json({
      error: t('message.error.unreadCountFailed', undefined, {
        defaultValue: 'Failed to get unread count',
      }),
      errorKey: 'message.error.unreadCountFailed',
    })
  }
}
