import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Product, ProductVariant } from '../types.js'

/**
 * Lists all variants for a given product.
 * @param req - The request object with `id` param (product ID).
 * @param res - The response object.
 */
export async function listVariants(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const productId = req.params.id as string

  try {
    const product = await findById<Product>('products', productId)
    if (!product || product.deletedAt) {
      res.status(404).json({
        error: t('product.error.notFound', undefined, { defaultValue: 'Product not found' }),
        errorKey: 'product.error.notFound',
      })
      return
    }

    const variants = await findMany<ProductVariant>('product_variants', {
      where: [{ field: 'productId', operator: '=', value: productId }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    res.json(variants)
  } catch (error) {
    logger.error('Failed to list product variants', { productId, error })
    res.status(500).json({
      error: t('product.error.listVariantsFailed', undefined, {
        defaultValue: 'Failed to list product variants',
      }),
      errorKey: 'product.error.listVariantsFailed',
    })
  }
}
