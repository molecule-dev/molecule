import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { RoomTypeRow, UpdateRoomTypeInput } from '../types.js'
import { toRoomType } from '../utilities.js'

/**
 * Updates an existing room type.
 *
 * The handler accepts a partial {@link UpdateRoomTypeInput} body and only
 * persists fields that are explicitly provided, leaving the rest untouched.
 * `propertyId` cannot be changed once a room type is created — moving
 * inventory between properties should be handled with a dedicated migration
 * flow.
 *
 * @param req - The request with `params.id` and an {@link UpdateRoomTypeInput} body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('roomType.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'roomType.error.unauthorized',
    })
    return
  }

  const input = req.body as UpdateRoomTypeInput

  if (input.capacity != null && (!Number.isFinite(input.capacity) || input.capacity < 1)) {
    res.status(400).json({
      error: t('roomType.error.invalidCapacity', undefined, {
        defaultValue: 'capacity must be a positive number',
      }),
      errorKey: 'roomType.error.invalidCapacity',
    })
    return
  }

  if (
    input.baseRateCents != null &&
    (!Number.isFinite(input.baseRateCents) || input.baseRateCents < 0)
  ) {
    res.status(400).json({
      error: t('roomType.error.invalidRate', undefined, {
        defaultValue: 'baseRateCents must be a non-negative number',
      }),
      errorKey: 'roomType.error.invalidRate',
    })
    return
  }

  if (input.totalUnits != null && (!Number.isFinite(input.totalUnits) || input.totalUnits < 0)) {
    res.status(400).json({
      error: t('roomType.error.invalidTotalUnits', undefined, {
        defaultValue: 'totalUnits must be a non-negative number',
      }),
      errorKey: 'roomType.error.invalidTotalUnits',
    })
    return
  }

  try {
    const existing = await findById<RoomTypeRow>('room_types', req.params.id)
    if (!existing) {
      res.status(404).json({
        error: t('roomType.error.notFound', undefined, { defaultValue: 'Room type not found' }),
        errorKey: 'roomType.error.notFound',
      })
      return
    }

    const patch: Partial<RoomTypeRow> = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.description !== undefined) patch.description = input.description ?? null
    if (input.capacity !== undefined) patch.capacity = input.capacity
    if (input.baseRateCents !== undefined) patch.baseRateCents = input.baseRateCents
    if (input.currency !== undefined) patch.currency = input.currency
    if (input.amenities !== undefined) patch.amenities = JSON.stringify(input.amenities)
    if (input.photos !== undefined) patch.photos = JSON.stringify(input.photos)
    if (input.totalUnits !== undefined) patch.totalUnits = input.totalUnits
    if (input.active !== undefined) patch.active = input.active
    if (input.metadata !== undefined) {
      patch.metadata = input.metadata ? JSON.stringify(input.metadata) : null
    }

    const result = await updateById<RoomTypeRow>('room_types', req.params.id, patch)
    const merged: RoomTypeRow = result.data ?? { ...existing, ...patch }

    res.json(toRoomType(merged))
  } catch (error) {
    logger.error('Failed to update room type', { roomTypeId: req.params.id, userId, error })
    res.status(500).json({
      error: t('roomType.error.updateFailed', undefined, {
        defaultValue: 'Failed to update room type',
      }),
      errorKey: 'roomType.error.updateFailed',
    })
  }
}
