/**
 * Count trash handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { countTrashedItems } from '../service.js'

/**
 * Returns the count of active trash rows matching the optional filters.
 *
 * Owner-scoped: the owner is derived from `res.locals.session.userId` and any
 * client-supplied `req.query.userId` is IGNORED, so a caller can only count
 * their own trash. Returns 401 when there is no authenticated session. When the
 * opt-in {@link trashAdmin} middleware has set `res.locals.trashAdmin`, an admin
 * may instead count by any `req.query.userId` (or omit it to count all users').
 *
 * @param req - The request, with optional `resourceType` and `includeInactive`
 *              query params (`userId` is honored only for admins; ignored
 *              otherwise).
 * @param res - The response object (reads `locals.session`/`locals.trashAdmin`).
 */
export async function trashCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const sessionUserId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!sessionUserId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const isAdmin = res.locals.trashAdmin === true
  const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : undefined
  const userId = isAdmin ? requestedUserId : sessionUserId

  const resourceType =
    typeof req.query.resourceType === 'string' ? req.query.resourceType : undefined
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1'

  try {
    const total = await countTrashedItems({ resourceType, userId, includeInactive })
    res.json({ total })
  } catch (error) {
    logger.error('Failed to count trashed items', { resourceType, userId, error })
    res.status(500).json({
      error: t('trash.error.countFailed', undefined, {
        defaultValue: 'Failed to count trashed items',
      }),
      errorKey: 'trash.error.countFailed',
    })
  }
}
