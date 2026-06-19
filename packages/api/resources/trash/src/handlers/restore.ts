/**
 * Restore trash handler.
 *
 * Looks up the registered {@link RestoreCallback} for the trash row's
 * `resourceType` and invokes it. Parent resources must register their
 * restore callback at startup via `registerRestoreCallback()` — the trash
 * package never imports concrete resources directly.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getRestoreCallback } from '../registry.js'
import { getTrashedItemById, restoreFromTrash } from '../service.js'

/**
 * Restores a trashed item by invoking the registered restore callback for
 * its resource type and stamping `restoredAt` on the trash row.
 *
 * @param req - The request with `trashId` param.
 * @param res - The response object.
 */
export async function restore(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { trashId } = req.params
  if (!trashId) {
    res.status(400).json({
      error: t('trash.error.missingId', undefined, {
        defaultValue: 'Trash ID is required',
      }),
      errorKey: 'trash.error.missingId',
    })
    return
  }

  const target = await getTrashedItemById(trashId)
  // Treat "not found" and "owned by someone else" identically so a non-owner
  // can neither restore another user's row nor learn that it exists. Admins
  // (opt-in widening via the `trashAdmin` middleware) may restore any row.
  const isAdmin = res.locals.trashAdmin === true
  if (!target || (!isAdmin && target.userId !== userId)) {
    res.status(404).json({
      error: t('trash.error.notFound', undefined, { defaultValue: 'Trashed item not found' }),
      errorKey: 'trash.error.notFound',
    })
    return
  }

  if (target.restoredAt || target.purgedAt) {
    res.status(409).json({
      error: t('trash.error.alreadyResolved', undefined, {
        defaultValue: 'Trashed item has already been restored or purged',
      }),
      errorKey: 'trash.error.alreadyResolved',
    })
    return
  }

  const callback = getRestoreCallback(target.resourceType)
  if (!callback) {
    res.status(501).json({
      error: t('trash.error.noRestoreHandler', undefined, {
        defaultValue: 'No restore handler is registered for this resource type',
      }),
      errorKey: 'trash.error.noRestoreHandler',
    })
    return
  }

  try {
    const result = await restoreFromTrash(trashId, userId, callback)
    if (!result) {
      res.status(404).json({
        error: t('trash.error.notFound', undefined, { defaultValue: 'Trashed item not found' }),
        errorKey: 'trash.error.notFound',
      })
      return
    }
    res.status(200).json(result.trashedItem)
  } catch (error) {
    logger.error('Failed to restore trashed item', {
      trashId,
      userId,
      resourceType: target.resourceType,
      error,
    })
    res.status(500).json({
      error: t('trash.error.restoreFailed', undefined, {
        defaultValue: 'Failed to restore trashed item',
      }),
      errorKey: 'trash.error.restoreFailed',
    })
  }
}
