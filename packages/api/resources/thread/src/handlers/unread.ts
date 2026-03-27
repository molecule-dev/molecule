/**
 * Unread count handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getUnreadCount } from '../service.js'

/**
 * Returns the number of threads with unread messages for the authenticated user.
 *
 * @param _req - The request object (unused).
 * @param res - The response object.
 */
export async function unread(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  try {
    const count = await getUnreadCount(userId)
    res.json({ count })
  } catch (error) {
    logger.error('Failed to get unread count', { userId, error })
    res.status(500).json({
      error: t('thread.error.unreadFailed', undefined, {
        defaultValue: 'Failed to get unread count',
      }),
      errorKey: 'thread.error.unreadFailed',
    })
  }
}
