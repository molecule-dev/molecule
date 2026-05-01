import type { WhereCondition } from '@molecule/api-database'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { PaginatedRoomTypes, RoomTypeQuery, RoomTypeRow } from '../types.js'
import { toRoomType } from '../utilities.js'

/**
 * Lists room types with optional filtering and pagination.
 *
 * Supports filtering by `propertyId`, an `activeOnly` flag, and a
 * `minCapacity` floor. Results are sorted by capacity descending so the
 * largest rooms appear first.
 *
 * @param req - The request with optional query params from {@link RoomTypeQuery}.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const query = req.query as unknown as RoomTypeQuery

  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20))

  try {
    const where: WhereCondition[] = []

    if (query.propertyId) {
      where.push({ field: 'propertyId', operator: '=' as const, value: query.propertyId })
    }

    // `activeOnly` arrives as a string from URL query parameters; treat any
    // value that isn't explicitly "false" as truthy, falling back to the
    // boolean type for programmatic callers.
    const activeOnly =
      typeof query.activeOnly === 'string'
        ? query.activeOnly !== 'false'
        : Boolean(query.activeOnly)
    if (activeOnly) {
      where.push({ field: 'active', operator: '=' as const, value: true })
    }

    if (query.minCapacity != null) {
      const minCapacity = parseInt(String(query.minCapacity), 10)
      if (Number.isFinite(minCapacity)) {
        where.push({ field: 'capacity', operator: '>=' as const, value: minCapacity })
      }
    }

    const total = await count('room_types', where)

    const rows = await findMany<RoomTypeRow>('room_types', {
      where,
      orderBy: [{ field: 'capacity', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })

    const result: PaginatedRoomTypes = {
      data: rows.map(toRoomType),
      total,
      page,
      limit,
    }

    res.json(result)
  } catch (error) {
    logger.error('Failed to list room types', { error })
    res.status(500).json({
      error: t('roomType.error.listFailed', undefined, {
        defaultValue: 'Failed to list room types',
      }),
      errorKey: 'roomType.error.listFailed',
    })
  }
}
