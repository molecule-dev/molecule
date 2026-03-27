import { create as dbCreate, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingRow, CreateBookingInput } from '../types.js'
import { computeEndTime, toBooking } from '../utilities.js'

/**
 * Creates a new booking for the authenticated user.
 * Validates no conflicting bookings exist for the requested time slot.
 * @param req - The request with {@link CreateBookingInput} body.
 * @param res - The response object.
 */
export async function book(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('booking.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'booking.error.unauthorized',
    })
    return
  }

  const input = req.body as CreateBookingInput

  if (!input.resourceType || !input.resourceId || !input.startTime || input.duration == null) {
    res.status(400).json({
      error: t('booking.error.fieldsRequired', undefined, {
        defaultValue: 'resourceType, resourceId, startTime, and duration are required',
      }),
      errorKey: 'booking.error.fieldsRequired',
    })
    return
  }

  if (input.duration < 1) {
    res.status(400).json({
      error: t('booking.error.invalidDuration', undefined, {
        defaultValue: 'Duration must be at least 1 minute',
      }),
      errorKey: 'booking.error.invalidDuration',
    })
    return
  }

  const endTime = computeEndTime(input.startTime, input.duration)

  try {
    // Check for conflicts — active bookings that overlap the requested slot
    const existingRows = await findMany<BookingRow>('bookings', {
      where: [
        { field: 'resourceType', operator: '=', value: input.resourceType },
        { field: 'resourceId', operator: '=', value: input.resourceId },
        { field: 'startTime', operator: '<', value: endTime },
        { field: 'endTime', operator: '>', value: input.startTime },
      ],
    })

    const hasConflict = existingRows.some((b) => b.status !== 'cancelled')

    if (hasConflict) {
      res.status(409).json({
        error: t('booking.error.conflict', undefined, {
          defaultValue: 'The requested time slot is not available',
        }),
        errorKey: 'booking.error.conflict',
      })
      return
    }

    const result = await dbCreate<BookingRow>('bookings', {
      userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: 'pending',
      startTime: input.startTime,
      endTime,
      duration: input.duration,
      notes: input.notes ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })

    logger.debug('Booking created', { bookingId: result.data!.id, userId })

    res.status(201).json(toBooking(result.data!))
  } catch (error) {
    logger.error('Failed to create booking', { userId, error })
    res.status(500).json({
      error: t('booking.error.createFailed', undefined, {
        defaultValue: 'Failed to create booking',
      }),
      errorKey: 'booking.error.createFailed',
    })
  }
}
