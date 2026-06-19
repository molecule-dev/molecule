import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isProductAdmin } from '../authorizers/index.js'
import type { Product } from '../types.js'

/**
 * Soft-deletes a product by setting its `deletedAt` timestamp.
 *
 * Admin-only and enforced here (not merely via route middleware): a product is a
 * shared catalog entity with no per-user owner, so a non-admin caller is rejected
 * (401 when unauthenticated, 403 otherwise) before anything is deleted —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired.
 *
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
