import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingRow } from '../types.js'
import { generateTimeSlots } from '../utilities.js'

/**
 * Checks availability for a resource on a given date.
 * Returns hourly time slots with availability status based on existing bookings.
 * @param req - The request with `params.resourceType`, `params.resourceId`, and query `date` and optional `duration`.
 * @param res - The response object.
 */
export async function checkAvailability(
  req: MoleculeRequest,
  res: MoleculeResponse,
): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('booking.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'booking.error.unauthorized',
    })
    return
  }

  const { resourceType, resourceId } = req.params
  const date = req.query.date as string | undefined
  const duration = parseInt(req.query.duration as string, 10) || 60

  if (!date) {
    res.status(400).json({
      error: t('booking.error.dateRequired', undefined, {
        defaultValue: 'Query parameter "date" is required',
      }),
      errorKey: 'booking.error.dateRequired',
    })
    return
  }

  try {
    const dayStart = new Date(date)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setUTCHours(23, 59, 59, 999)

    const bookingRows = await findMany<BookingRow>('bookings', {
      where: [
        { field: 'resourceType', operator: '=', value: resourceType },
        { field: 'resourceId', operator: '=', value: resourceId },
        { field: 'startTime', operator: '>=', value: dayStart.toISOString() },
        { field: 'startTime', operator: '<=', value: dayEnd.toISOString() },
      ],
    })

    const slots = generateTimeSlots(date, duration, bookingRows)

    res.json(slots)
  } catch (error) {
    logger.error('Failed to check availability', { resourceType, resourceId, date, error })
    res.status(500).json({
      error: t('booking.error.availabilityFailed', undefined, {
        defaultValue: 'Failed to check availability',
      }),
      errorKey: 'booking.error.availabilityFailed',
    })
  }
}
