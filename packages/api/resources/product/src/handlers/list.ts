import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Product } from '../types.js'

/**
 * Lists products with pagination and optional status filter. Excludes soft-deleted products.
 * @param req - The request object with optional `page`, `perPage`, and `status` query params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string, 10) || 20))
  const status = req.query.status as string | undefined

  const where: WhereCondition[] = [{ field: 'deletedAt', operator: 'is_null' }]

  if (status) {
    where.push({ field: 'status', operator: '=', value: status })
  }

  try {
    const products = await findMany<Product>('products', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: perPage,
      offset: (page - 1) * perPage,
    })

    res.json({ data: products, page, perPage })
  } catch (error) {
    logger.error('Failed to list products', { error })
    res.status(500).json({
      error: t('product.error.listFailed', undefined, { defaultValue: 'Failed to list products' }),
      errorKey: 'product.error.listFailed',
    })
  }
}
