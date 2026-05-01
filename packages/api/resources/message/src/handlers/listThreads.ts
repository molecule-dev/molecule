/**
 * List threads for the authenticated user.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { listThreadsForParticipant } from '../service.js'

/**
 * Returns paginated threads for the authenticated user, newest first.
 *
 * @param req - The request with optional `limit` / `offset` query params.
 * @param res - The response object.
 */
export async function listThreads(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 50
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const threads = await listThreadsForParticipant(userId, { limit, offset })
    res.json({ data: threads, limit, offset })
  } catch (error) {
    logger.error('Failed to list threads', { userId, error })
    res.status(500).json({
      error: t('message.error.listThreadsFailed', undefined, {
        defaultValue: 'Failed to list threads',
      }),
      errorKey: 'message.error.listThreadsFailed',
    })
  }
}
