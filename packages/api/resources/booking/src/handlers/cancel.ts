import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingRow, BookingStatus, CancelBookingInput } from '../types.js'
import { STATUS_TRANSITIONS } from '../types.js'
import { toBooking } from '../utilities.js'

/**
 * Cancels a booking. Only the booking owner can cancel, and only from valid states.
 * @param req - The request with `params.id` and optional {@link CancelBookingInput} body.
 * @param res - The response object.
 */
export async function cancel(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('booking.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'booking.error.unauthorized',
    })
    return
  }

  const input = req.body as CancelBookingInput | undefined

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

    const allowedTransitions = STATUS_TRANSITIONS[row.status as BookingStatus]
    if (!allowedTransitions || !allowedTransitions.includes('cancelled')) {
      res.status(409).json({
        error: t('booking.error.cannotCancel', undefined, {
          defaultValue: `Booking cannot be cancelled from '${row.status}' status`,
        }),
        errorKey: 'booking.error.cannotCancel',
      })
      return
    }

    const now = new Date().toISOString()
    const metadata: Record<string, unknown> = row.metadata ? JSON.parse(row.metadata) : {}
    if (input?.reason) metadata.cancellationReason = input.reason

    await updateById('bookings', row.id, {
      status: 'cancelled',
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      updatedAt: now,
    })

    const updatedRow: BookingRow = {
      ...row,
      status: 'cancelled',
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      updatedAt: now,
    }

    logger.debug('Booking cancelled', { bookingId: row.id, userId, reason: input?.reason })

    res.json(toBooking(updatedRow))
  } catch (error) {
    logger.error('Failed to cancel booking', { bookingId: req.params.id, error })
    res.status(500).json({
      error: t('booking.error.cancelFailed', undefined, {
        defaultValue: 'Failed to cancel booking',
      }),
      errorKey: 'booking.error.cancelFailed',
    })
  }
}
