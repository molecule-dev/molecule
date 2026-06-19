/**
 * List trash handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { listTrashedItems } from '../service.js'

/**
 * Lists paginated trash rows, defaulting to active-only and newest-first.
 *
 * Owner-scoped: the owner is derived from `res.locals.session.userId` and any
 * client-supplied `req.query.userId` is IGNORED — trash rows capture snapshots
 * of deleted records, so an unscoped list keyed off a client `userId` would be
 * a one-request cross-tenant dump. Returns 401 when there is no authenticated
 * session. When the opt-in {@link trashAdmin} middleware has set
 * `res.locals.trashAdmin`, an admin may instead filter by any `req.query.userId`
 * (or omit it to inspect every user's rows).
 *
 * @param req - The request, with optional `resourceType`, `limit`, `offset`,
 *              and `includeInactive` query params (`userId` is honored only for
 *              admins; ignored otherwise).
 * @param res - The response object (reads `locals.session`/`locals.trashAdmin`).
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
  // Non-admins are forced to their own rows; admins may filter by any user
  // (or omit `userId` to span all users).
  const userId = isAdmin ? requestedUserId : sessionUserId

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0
  const resourceType =
    typeof req.query.resourceType === 'string' ? req.query.resourceType : undefined
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1'

  try {
    const result = await listTrashedItems({
      resourceType,
      userId,
      includeInactive,
      limit,
      offset,
    })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list trashed items', { resourceType, userId, error })
    res.status(500).json({
      error: t('trash.error.listFailed', undefined, {
        defaultValue: 'Failed to list trashed items',
      }),
      errorKey: 'trash.error.listFailed',
    })
  }
}
