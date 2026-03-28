/**
 * Delete thread handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { deleteThread } from '../service.js'

/**
 * Deletes a thread. Only the thread creator can delete.
 *
 * @param req - The request with `threadId` param.
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

  const { threadId } = req.params
  if (!threadId) {
    res.status(400).json({
      error: t('thread.error.missingId', undefined, { defaultValue: 'Thread ID is required' }),
      errorKey: 'thread.error.missingId',
    })
    return
  }

  try {
    const deleted = await deleteThread(threadId, userId)
    if (!deleted) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete thread', { threadId, userId, error })
    res.status(500).json({
      error: t('thread.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete thread',
      }),
      errorKey: 'thread.error.deleteFailed',
    })
  }
}
