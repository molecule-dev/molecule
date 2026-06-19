import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isProductAdmin } from '../authorizers/index.js'
import type { Product, UpdateProductInput } from '../types.js'

/**
 * Updates a product by ID. Only provided fields are modified.
 *
 * Admin-only and enforced here (not merely via route middleware): a product is a
 * shared catalog entity with no per-user owner, so a non-admin caller is rejected
 * (401 when unauthenticated, 403 otherwise) before any price/stock change —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired.
 *
 * @param req - The request object with `id` param and {@link UpdateProductInput} body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }
  if (!(await isProductAdmin(res))) {
    res.status(403).json({
      error: t('product.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage products',
      }),
      errorKey: 'product.error.forbidden',
    })
    return
  }

  const id = req.params.id as string
  const input = req.body as UpdateProductInput

  const product = await findById<Product>('products', id)
  if (!product || product.deletedAt) {
    res.status(404).json({
      error: t('product.error.notFound', undefined, { defaultValue: 'Product not found' }),
      errorKey: 'product.error.notFound',
    })
    return
  }

  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.price !== undefined) data.price = input.price
  if (input.currency !== undefined) data.currency = input.currency
  if (input.status !== undefined) data.status = input.status
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl
  if (input.sku !== undefined) data.sku = input.sku
  if (input.inventory !== undefined) data.inventory = input.inventory

  try {
    const result = await updateById<Product>('products', id, data)
    logger.debug('Product updated', { id })
    res.json(result.data)
  } catch (error) {
    logger.error('Failed to update product', { id, error })
    res.status(500).json({
      error: t('product.error.updateFailed', undefined, {
        defaultValue: 'Failed to update product',
      }),
      errorKey: 'product.error.updateFailed',
    })
  }
}
