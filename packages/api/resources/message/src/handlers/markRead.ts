/**
 * Mark a thread as read for the authenticated user.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { markRead } from '../service.js'

/**
 * Marks a thread as read and zeroes the authenticated user's unread
 * counter for that thread. Broadcasts a `message:read` event over the
 * bonded realtime provider.
 *
 * @param req - The request with `threadId` URL param.
 * @param res - The response object.
 */
export async function markReadHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
      error: t('message.error.missingThreadId', undefined, {
        defaultValue: 'Thread ID is required',
      }),
      errorKey: 'message.error.missingThreadId',
    })
    return
  }

  try {
    await markRead(threadId, userId)
    res.status(204).end()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('not found')) {
      res.status(404).json({
        error: t('message.error.threadNotFound', undefined, {
          defaultValue: 'Thread not found',
        }),
        errorKey: 'message.error.threadNotFound',
      })
      return
    }
    if (errorMessage.includes('not a participant')) {
      res.status(403).json({
        error: t('message.error.notParticipant', undefined, {
          defaultValue: 'You are not a participant in this thread',
        }),
        errorKey: 'message.error.notParticipant',
      })
      return
    }
    logger.error('Failed to mark thread as read', { threadId, userId, error })
    res.status(500).json({
      error: t('message.error.markReadFailed', undefined, {
        defaultValue: 'Failed to mark thread as read',
      }),
      errorKey: 'message.error.markReadFailed',
    })
  }
}
