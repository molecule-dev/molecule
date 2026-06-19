/**
 * Purge trash handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getTrashedItemById, purgeItem } from '../service.js'

/**
 * Permanently purges a trash row by stamping `purgedAt`. Snapshot is
 * retained for audit purposes; use the programmatic `purgeItemHard()`
 * service method to remove the row entirely.
 *
 * @param req - The request with `trashId` param.
 * @param res - The response object.
 */
export async function purge(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  try {
    const target = await getTrashedItemById(trashId)
    // Treat "not found" and "owned by someone else" identically so a non-owner
    // can neither purge another user's row nor learn that it exists. Admins
    // (opt-in widening via the `trashAdmin` middleware) may purge any row.
    const isAdmin = res.locals.trashAdmin === true
    if (!target || (!isAdmin && target.userId !== userId)) {
      res.status(404).json({
        error: t('trash.error.notFound', undefined, {
          defaultValue: 'Trashed item not found',
        }),
        errorKey: 'trash.error.notFound',
      })
      return
    }

    const purged = await purgeItem(trashId)
    if (!purged) {
      res.status(404).json({
        error: t('trash.error.notFound', undefined, {
          defaultValue: 'Trashed item not found',
        }),
        errorKey: 'trash.error.notFound',
      })
      return
    }
    res.status(200).json(purged)
  } catch (error) {
    logger.error('Failed to purge trashed item', { trashId, userId, error })
    res.status(500).json({
      error: t('trash.error.purgeFailed', undefined, {
        defaultValue: 'Failed to purge trashed item',
      }),
      errorKey: 'trash.error.purgeFailed',
    })
  }
}
