import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Property } from '../types.js'

/**
 * Lists properties with pagination and optional status / type / city filters.
 * Excludes soft-deleted properties.
 *
 * @param req - The request object with optional `page`, `perPage`, `status`, `type`, `city` query params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string, 10) || 20))
  const status = req.query.status as string | undefined
  const type = req.query.type as string | undefined
  const city = req.query.city as string | undefined

  const where: WhereCondition[] = [{ field: 'deletedAt', operator: 'is_null' }]

  if (status) {
    where.push({ field: 'status', operator: '=', value: status })
  }
  if (type) {
    where.push({ field: 'type', operator: '=', value: type })
  }
  if (city) {
    where.push({ field: 'city', operator: '=', value: city })
  }

  try {
    const properties = await findMany<Property>('properties', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: perPage,
      offset: (page - 1) * perPage,
    })

    res.json({ data: properties, page, perPage })
  } catch (error) {
    logger.error('Failed to list properties', { error })
    res.status(500).json({
      error: t('property.error.listFailed', undefined, {
        defaultValue: 'Failed to list properties',
      }),
      errorKey: 'property.error.listFailed',
    })
  }
}
