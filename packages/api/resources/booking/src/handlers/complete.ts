import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingRow, BookingStatus } from '../types.js'
import { STATUS_TRANSITIONS } from '../types.js'
import { toBooking } from '../utilities.js'

/**
 * Marks a confirmed booking as completed.
 * @param req - The request with `params.id`.
 * @param res - The response object.
 */
export async function complete(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    if (!allowedTransitions || !allowedTransitions.includes('completed')) {
      res.status(409).json({
        error: t('booking.error.cannotComplete', undefined, {
          defaultValue: `Booking cannot be completed from '${row.status}' status`,
        }),
        errorKey: 'booking.error.cannotComplete',
      })
      return
    }

    const now = new Date().toISOString()

    await updateById('bookings', row.id, {
      status: 'completed',
      updatedAt: now,
    })

    const updatedRow: BookingRow = { ...row, status: 'completed', updatedAt: now }

    logger.debug('Booking completed', { bookingId: row.id, userId })

    res.json(toBooking(updatedRow))
  } catch (error) {
    logger.error('Failed to complete booking', { bookingId: req.params.id, error })
    res.status(500).json({
      error: t('booking.error.completeFailed', undefined, {
        defaultValue: 'Failed to complete booking',
      }),
      errorKey: 'booking.error.completeFailed',
    })
  }
}
