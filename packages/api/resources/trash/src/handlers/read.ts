/**
 * Read trash handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getTrashedItemById } from '../service.js'

/**
 * Reads a single trash row by ID.
 *
 * Owner-scoped: returns 401 with no session, and 404 when the row is missing
 * OR owned by a different user — a non-owner cannot tell the two apart, so the
 * existence of another user's deleted-record snapshot is never leaked. When the
 * opt-in {@link trashAdmin} middleware has set `res.locals.trashAdmin`, an admin
 * may read any user's row.
 *
 * @param req - The request with `trashId` param.
 * @param res - The response object (reads `locals.session`/`locals.trashAdmin`).
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    const item = await getTrashedItemById(trashId)
    // Treat "not found" and "owned by someone else" identically so existence is
    // not leaked to a non-owner. Admins (opt-in widening) may read any row.
    const isAdmin = res.locals.trashAdmin === true
    if (!item || (!isAdmin && item.userId !== userId)) {
      res.status(404).json({
        error: t('trash.error.notFound', undefined, { defaultValue: 'Trashed item not found' }),
        errorKey: 'trash.error.notFound',
      })
      return
    }
    res.json(item)
  } catch (error) {
    logger.error('Failed to read trashed item', { trashId, error })
    res.status(500).json({
      error: t('trash.error.readFailed', undefined, {
        defaultValue: 'Failed to read trashed item',
      }),
      errorKey: 'trash.error.readFailed',
    })
  }
}
