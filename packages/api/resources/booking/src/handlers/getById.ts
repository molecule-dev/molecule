import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingRow } from '../types.js'
import { toBooking } from '../utilities.js'

/**
 * Retrieves a single booking by ID. Only the booking owner can access it.
 * @param req - The request with `params.id`.
 * @param res - The response object.
 */
export async function getById(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('booking.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'booking.error.unauthorized',
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

    res.json(toBooking(row))
  } catch (error) {
    logger.error('Failed to get booking', { bookingId: req.params.id, error })
    res.status(500).json({
      error: t('booking.error.getFailed', undefined, {
        defaultValue: 'Failed to get booking',
      }),
      errorKey: 'booking.error.getFailed',
    })
  }
}
