/**
 * Read a single thread by ID.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getThreadById } from '../service.js'

/**
 * Returns the thread identified by `:threadId`. The authenticated user
 * must be a participant.
 *
 * @param req - The request with `threadId` URL param.
 * @param res - The response object.
 */
export async function readThread(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    const thread = await getThreadById(threadId)
    if (!thread) {
      res.status(404).json({
        error: t('message.error.threadNotFound', undefined, {
          defaultValue: 'Thread not found',
        }),
        errorKey: 'message.error.threadNotFound',
      })
      return
    }
    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      res.status(403).json({
        error: t('message.error.notParticipant', undefined, {
          defaultValue: 'You are not a participant in this thread',
        }),
        errorKey: 'message.error.notParticipant',
      })
      return
    }
    res.json(thread)
  } catch (error) {
    logger.error('Failed to read thread', { threadId, error })
    res.status(500).json({
      error: t('message.error.readThreadFailed', undefined, {
        defaultValue: 'Failed to read thread',
      }),
      errorKey: 'message.error.readThreadFailed',
    })
  }
}
