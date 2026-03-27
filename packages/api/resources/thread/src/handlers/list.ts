/**
 * List threads handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getThreads } from '../service.js'

/**
 * Lists paginated threads for the authenticated user.
 *
 * @param req - The request with optional query params for filtering and pagination.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0
  const resourceType = req.query.resourceType as string | undefined
  const resourceId = req.query.resourceId as string | undefined
  const closedParam = req.query.closed as string | undefined
  const closed = closedParam === 'true' ? true : closedParam === 'false' ? false : undefined

  try {
    const result = await getThreads(userId, { limit, offset, resourceType, resourceId, closed })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list threads', { userId, error })
    res.status(500).json({
      error: t('thread.error.listFailed', undefined, { defaultValue: 'Failed to list threads' }),
      errorKey: 'thread.error.listFailed',
    })
  }
}
