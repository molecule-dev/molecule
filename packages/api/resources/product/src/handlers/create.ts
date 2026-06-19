import { create as dbCreate, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isProductAdmin } from '../authorizers/index.js'
import type { CreateProductInput, Product } from '../types.js'

/**
 * Converts a string to a URL-friendly slug.
 * @param name - The string to slugify.
 * @returns The slugified string.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Creates a new product with a unique slug derived from the name.
 *
 * Admin-only and enforced here (not merely via route middleware): a product is a
 * shared catalog entity with no per-user owner, so a non-admin caller is rejected
 * (401 when unauthenticated, 403 otherwise) before any catalog row is inserted —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired.
 *
 * @param req - The incoming request with {@link CreateProductInput} body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const input = req.body as CreateProductInput

  if (!input.name?.trim()) {
    res.status(400).json({
      error: t('product.error.nameRequired', undefined, {
        defaultValue: 'Product name is required',
      }),
      errorKey: 'product.error.nameRequired',
    })
    return
  }

  if (input.price === undefined || input.price === null || input.price < 0) {
    res.status(400).json({
      error: t('product.error.invalidPrice', undefined, {
        defaultValue: 'A valid price is required',
      }),
      errorKey: 'product.error.invalidPrice',
    })
    return
  }

  let slug = slugify(input.name)
  if (!slug) {
    res.status(400).json({
      error: t('product.error.invalidName', undefined, { defaultValue: 'Product name is invalid' }),
      errorKey: 'product.error.invalidName',
    })
    return
  }

  const existing = await findOne('products', [{ field: 'slug', operator: '=', value: slug }])
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  try {
    const result = await dbCreate<Product>('products', {
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      price: input.price,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'draft',
      imageUrl: input.imageUrl ?? null,
      sku: input.sku ?? null,
      inventory: input.inventory ?? null,
    })

    logger.debug('Product created', { productId: result.data?.id, slug })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create product', { slug, error })
    res.status(500).json({
      error: t('product.error.createFailed', undefined, {
        defaultValue: 'Failed to create product',
      }),
      errorKey: 'product.error.createFailed',
    })
  }
}
