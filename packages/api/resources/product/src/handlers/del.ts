import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Product } from '../types.js'

/**
 * Soft-deletes a product by setting its `deletedAt` timestamp.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  const product = await findById<Product>('products', id)
  if (!product || product.deletedAt) {
    res.status(404).json({
      error: t('product.error.notFound', undefined, { defaultValue: 'Product not found' }),
      errorKey: 'product.error.notFound',
    })
    return
  }

  try {
    await updateById('products', id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    logger.debug('Product soft-deleted', { id })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete product', { id, error })
    res.status(500).json({
      error: t('product.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete product',
      }),
      errorKey: 'product.error.deleteFailed',
    })
  }
}
