import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { RoomTypeRow } from '../types.js'
import { toRoomType } from '../utilities.js'

/**
 * Retrieves a single room type by ID.
 *
 * Read access is intentionally permissive — room-type metadata is
 * customer-facing inventory information. If a downstream caller needs to
 * gate access (for example, hiding inactive types from non-owners), wrap
 * this handler with an authorizer.
 *
 * @param req - The request with `params.id`.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  try {
    const row = await findById<RoomTypeRow>('room_types', req.params.id)

    if (!row) {
      res.status(404).json({
        error: t('roomType.error.notFound', undefined, { defaultValue: 'Room type not found' }),
        errorKey: 'roomType.error.notFound',
      })
      return
    }

    res.json(toRoomType(row))
  } catch (error) {
    logger.error('Failed to read room type', { roomTypeId: req.params.id, error })
    res.status(500).json({
      error: t('roomType.error.readFailed', undefined, {
        defaultValue: 'Failed to read room type',
      }),
      errorKey: 'roomType.error.readFailed',
    })
  }
}
