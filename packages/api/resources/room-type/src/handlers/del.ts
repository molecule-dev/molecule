import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isRoomTypeAdmin } from '../authorizers/index.js'

/**
 * Deletes a room type by ID.
 *
 * Hard-deletes the row. Callers that need soft-delete semantics (preserving
 * historical bookings that reference the type) should set `active = false`
 * via {@link update} instead.
 *
 * Admin-only and enforced here (not merely via route middleware): a room type has
 * no per-user owner column, so a non-admin caller is rejected (401 when
 * unauthenticated, 403 otherwise) before anything is deleted — defense-in-depth
 * that does not depend on the `requireAdmin` route middleware being wired.
 *
 * @param req - The request with `params.id`.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('roomType.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'roomType.error.unauthorized',
    })
    return
  }
  if (!(await isRoomTypeAdmin(res))) {
    res.status(403).json({
      error: t('roomType.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage room types',
      }),
      errorKey: 'roomType.error.forbidden',
    })
    return
  }

  try {
    const result = await deleteById('room_types', req.params.id)
    if (!result.affected) {
      res.status(404).json({
        error: t('roomType.error.notFound', undefined, { defaultValue: 'Room type not found' }),
        errorKey: 'roomType.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete room type', { roomTypeId: req.params.id, userId, error })
    res.status(500).json({
      error: t('roomType.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete room type',
      }),
      errorKey: 'roomType.error.deleteFailed',
    })
  }
}
