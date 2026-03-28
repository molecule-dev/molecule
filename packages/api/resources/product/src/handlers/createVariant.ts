import { create as dbCreate, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateVariantInput, Product, ProductVariant } from '../types.js'

/**
 * Creates a variant for a given product.
 * @param req - The request object with `id` param (product ID) and {@link CreateVariantInput} body.
 * @param res - The response object.
 */
export async function createVariant(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const productId = req.params.id as string
  const input = req.body as CreateVariantInput

  try {
    const product = await findById<Product>('products', productId)
    if (!product || product.deletedAt) {
      res.status(404).json({
        error: t('product.error.notFound', undefined, { defaultValue: 'Product not found' }),
        errorKey: 'product.error.notFound',
      })
      return
    }

    if (!input.name?.trim()) {
      res.status(400).json({
        error: t('product.error.variantNameRequired', undefined, {
          defaultValue: 'Variant name is required',
        }),
        errorKey: 'product.error.variantNameRequired',
      })
      return
    }

    const result = await dbCreate<ProductVariant>('product_variants', {
      productId,
      name: input.name.trim(),
      sku: input.sku ?? null,
      price: input.price ?? null,
      inventory: input.inventory ?? null,
    })

    logger.debug('Product variant created', { productId, variantId: result.data?.id })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create product variant', { productId, error })
    res.status(500).json({
      error: t('product.error.createVariantFailed', undefined, {
        defaultValue: 'Failed to create product variant',
      }),
      errorKey: 'product.error.createVariantFailed',
    })
  }
}
