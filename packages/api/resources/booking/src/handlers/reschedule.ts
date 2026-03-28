import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingRow, RescheduleBookingInput } from '../types.js'
import { computeEndTime, toBooking } from '../utilities.js'

/**
 * Reschedules a booking to a new time. Only the booking owner can reschedule,
 * and only pending or confirmed bookings can be rescheduled.
 * @param req - The request with `params.id` and {@link RescheduleBookingInput} body.
 * @param res - The response object.
 */
export async function reschedule(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('booking.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'booking.error.unauthorized',
    })
    return
  }

  const input = req.body as RescheduleBookingInput

  if (!input.startTime) {
    res.status(400).json({
      error: t('booking.error.startTimeRequired', undefined, {
        defaultValue: 'startTime is required for rescheduling',
      }),
      errorKey: 'booking.error.startTimeRequired',
    })
    return
  }

  try {
    const row = await findById<BookingRow>('bookings', req.params.id)

    if (!row) {
      res.status(404).json({
        error: t('booking.error.notFound', undefined, { defaultValue: 'Booking not found' }),
        errorKey: 'booking.error.notFound',
      })
      return
    }

    if (row.userId !== userId) {
      res.status(403).json({
        error: t('booking.error.forbidden', undefined, {
          defaultValue: 'You do not have access to this booking',
        }),
        errorKey: 'booking.error.forbidden',
      })
      return
    }

    if (row.status !== 'pending' && row.status !== 'confirmed') {
      res.status(409).json({
        error: t('booking.error.cannotReschedule', undefined, {
          defaultValue: `Booking cannot be rescheduled from '${row.status}' status`,
        }),
        errorKey: 'booking.error.cannotReschedule',
      })
      return
    }

    const newDuration = input.duration ?? row.duration
    const newEndTime = computeEndTime(input.startTime, newDuration)

    // Check for conflicts excluding the current booking
    const existingRows = await findMany<BookingRow>('bookings', {
      where: [
        { field: 'resourceType', operator: '=', value: row.resourceType },
        { field: 'resourceId', operator: '=', value: row.resourceId },
        { field: 'startTime', operator: '<', value: newEndTime },
        { field: 'endTime', operator: '>', value: input.startTime },
      ],
    })

    const hasConflict = existingRows.some((b) => b.id !== row.id && b.status !== 'cancelled')

    if (hasConflict) {
      res.status(409).json({
        error: t('booking.error.conflict', undefined, {
          defaultValue: 'The requested time slot is not available',
        }),
        errorKey: 'booking.error.conflict',
      })
      return
    }

    const now = new Date().toISOString()

    await updateById('bookings', row.id, {
      startTime: input.startTime,
      endTime: newEndTime,
      duration: newDuration,
      updatedAt: now,
    })

    const updatedRow: BookingRow = {
      ...row,
      startTime: input.startTime,
      endTime: newEndTime,
      duration: newDuration,
      updatedAt: now,
    }

    logger.debug('Booking rescheduled', { bookingId: row.id, userId })

    res.json(toBooking(updatedRow))
  } catch (error) {
    logger.error('Failed to reschedule booking', { bookingId: req.params.id, error })
    res.status(500).json({
      error: t('booking.error.rescheduleFailed', undefined, {
        defaultValue: 'Failed to reschedule booking',
      }),
      errorKey: 'booking.error.rescheduleFailed',
    })
  }
}
