import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingRow, BookingStatus } from '../types.js'
import { STATUS_TRANSITIONS } from '../types.js'
import { toBooking } from '../utilities.js'

/**
 * Confirms a pending booking.
 * @param req - The request with `params.id`.
 * @param res - The response object.
 */
export async function confirm(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

    const allowedTransitions = STATUS_TRANSITIONS[row.status as BookingStatus]
    if (!allowedTransitions || !allowedTransitions.includes('confirmed')) {
      res.status(409).json({
        error: t('booking.error.cannotConfirm', undefined, {
          defaultValue: `Booking cannot be confirmed from '${row.status}' status`,
        }),
        errorKey: 'booking.error.cannotConfirm',
      })
      return
    }

    const now = new Date().toISOString()

    await updateById('bookings', row.id, {
      status: 'confirmed',
      updatedAt: now,
    })

    const updatedRow: BookingRow = { ...row, status: 'confirmed', updatedAt: now }

    logger.debug('Booking confirmed', { bookingId: row.id, userId })

    res.json(toBooking(updatedRow))
  } catch (error) {
    logger.error('Failed to confirm booking', { bookingId: req.params.id, error })
    res.status(500).json({
      error: t('booking.error.confirmFailed', undefined, {
        defaultValue: 'Failed to confirm booking',
      }),
      errorKey: 'booking.error.confirmFailed',
    })
  }
}
