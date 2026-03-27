import type { WhereCondition } from '@molecule/api-database'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { BookingQuery, BookingRow, BookingStatus, PaginatedResult } from '../types.js'
import { BOOKING_STATUSES } from '../types.js'
import { toBooking } from '../utilities.js'

/**
 * Lists bookings for the authenticated user with optional filtering and pagination.
 * @param req - The request with optional query params for status, from, to, page, limit.
 * @param res - The response object.
 */
export async function getBookings(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('booking.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'booking.error.unauthorized',
    })
    return
  }

  const query = req.query as unknown as BookingQuery

  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20))

  try {
    const where: WhereCondition[] = [{ field: 'userId', operator: '=' as const, value: userId }]

    if (query.status && BOOKING_STATUSES.includes(query.status as BookingStatus)) {
      where.push({ field: 'status', operator: '=' as const, value: query.status })
    }

    if (query.from) {
      where.push({ field: 'startTime', operator: '>=' as const, value: query.from })
    }

    if (query.to) {
      where.push({ field: 'startTime', operator: '<=' as const, value: query.to })
    }

    const total = await count('bookings', where)

    const rows = await findMany<BookingRow>('bookings', {
      where,
      orderBy: [{ field: 'startTime', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })

    const result: PaginatedResult<ReturnType<typeof toBooking>> = {
      data: rows.map(toBooking),
      total,
      page,
      limit,
    }

    res.json(result)
  } catch (error) {
    logger.error('Failed to list bookings', { userId, error })
    res.status(500).json({
      error: t('booking.error.listFailed', undefined, {
        defaultValue: 'Failed to list bookings',
      }),
      errorKey: 'booking.error.listFailed',
    })
  }
}
