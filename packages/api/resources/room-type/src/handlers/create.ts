import { create as dbCreate } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isRoomTypeAdmin } from '../authorizers/index.js'
import type { CreateRoomTypeInput, RoomTypeRow } from '../types.js'
import { toRoomType, validateCreateInput } from '../utilities.js'

/**
 * Creates a new room type for a property.
 *
 * Validates the request body and inserts a row in the `room_types` table.
 *
 * Admin-only and enforced here (not merely via route middleware): a room type has
 * no per-user owner column, so a non-admin caller is rejected (401 when
 * unauthenticated, 403 otherwise) before any inventory/pricing row is inserted —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired. An app that models per-property ownership can grant the
 * `manage roomType` permission (see `authorizers/index.ts`).
 *
 * @param req - The request with a {@link CreateRoomTypeInput} body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const input = req.body as Partial<CreateRoomTypeInput> & Record<string, unknown>
  const errorKey = validateCreateInput(input)
  if (errorKey) {
    res.status(400).json({
      error: t(errorKey, undefined, { defaultValue: 'Invalid room-type payload' }),
      errorKey,
    })
    return
  }

  const valid = input as CreateRoomTypeInput

  try {
    const result = await dbCreate<RoomTypeRow>('room_types', {
      propertyId: valid.propertyId,
      name: valid.name,
      description: valid.description ?? null,
      capacity: valid.capacity,
      baseRateCents: valid.baseRateCents,
      currency: valid.currency,
      amenities: JSON.stringify(valid.amenities ?? []),
      photos: JSON.stringify(valid.photos ?? []),
      totalUnits: valid.totalUnits,
      active: valid.active ?? true,
      metadata: valid.metadata ? JSON.stringify(valid.metadata) : null,
    })

    logger.debug('Room type created', { roomTypeId: result.data!.id, userId })

    res.status(201).json(toRoomType(result.data!))
  } catch (error) {
    logger.error('Failed to create room type', { userId, error })
    res.status(500).json({
      error: t('roomType.error.createFailed', undefined, {
        defaultValue: 'Failed to create room type',
      }),
      errorKey: 'roomType.error.createFailed',
    })
  }
}
