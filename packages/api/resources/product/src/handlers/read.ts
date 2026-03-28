import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Product } from '../types.js'

/**
 * Reads a single product by ID. Returns 404 if not found or soft-deleted.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  try {
    const product = await findById<Product>('products', id)
    if (!product || product.deletedAt) {
      res.status(404).json({
        error: t('product.error.notFound', undefined, { defaultValue: 'Product not found' }),
        errorKey: 'product.error.notFound',
      })
      return
    }

    res.json(product)
  } catch (error) {
    logger.error('Failed to read product', { id, error })
    res.status(500).json({
      error: t('product.error.readFailed', undefined, { defaultValue: 'Failed to read product' }),
      errorKey: 'product.error.readFailed',
    })
  }
}
