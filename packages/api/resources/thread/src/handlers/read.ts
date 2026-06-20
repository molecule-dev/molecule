/**
 * Read thread handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getThreadById } from '../service.js'

/**
 * Retrieves a single thread by ID.
 *
 * @param req - The request with `threadId` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // [M6-1] Threads are private (creator-owned). The route's bare `authenticate` is stripped
  // by the scaffold scanner, so this handler must fail closed itself — otherwise an anonymous
  // caller could read any thread by id (IDOR on private conversations). Mirrors the sibling
  // handlers (list/unread/…) and the @molecule/api-resource-message participant gate.
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
    const thread = await getThreadById(threadId)
    // 404 (not 403) for a non-owner so a thread's existence is not leaked.
    if (!thread || thread.creatorId !== userId) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(thread)
  } catch (error) {
    logger.error('Failed to read thread', { threadId, error })
    res.status(500).json({
      error: t('thread.error.readFailed', undefined, { defaultValue: 'Failed to read thread' }),
      errorKey: 'thread.error.readFailed',
    })
  }
}
