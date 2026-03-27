/**
 * Mark thread as read handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { markRead } from '../service.js'

/**
 * Marks a thread as read up to a specific message for the authenticated user.
 *
 * @param req - The request with `threadId` param and `lastReadMessageId` in body.
 * @param res - The response object.
 */
export async function markThreadRead(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { threadId } = req.params
  if (!threadId) {
    res.status(400).json({
      error: t('thread.error.missingId', undefined, { defaultValue: 'Thread ID is required' }),
      errorKey: 'thread.error.missingId',
    })
    return
  }

  const { lastReadMessageId } = req.body as { lastReadMessageId?: string }
  if (!lastReadMessageId) {
    res.status(400).json({
      error: t('thread.error.missingMessageId', undefined, {
        defaultValue: 'Message ID is required',
      }),
      errorKey: 'thread.error.missingMessageId',
    })
    return
  }

  try {
    await markRead(threadId, userId, lastReadMessageId)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to mark thread as read', { threadId, userId, error })
    res.status(500).json({
      error: t('thread.error.markReadFailed', undefined, {
        defaultValue: 'Failed to mark thread as read',
      }),
      errorKey: 'thread.error.markReadFailed',
    })
  }
}
