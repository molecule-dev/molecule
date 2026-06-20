import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Property } from '../types.js'

/**
 * Reads a single property by ID. Returns 404 if not found or soft-deleted.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  try {
    const property = await findById<Property>('properties', id)
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId
    // Visibility (P5RES-1): a non-active (draft/inactive/archived) property is visible
    // only to its owner; 404 (not 403) for others so its existence isn't leaked.
    if (
      !property ||
      property.deletedAt ||
      (property.status !== 'active' && property.ownerId !== userId)
    ) {
      res.status(404).json({
        error: t('property.error.notFound', undefined, { defaultValue: 'Property not found' }),
        errorKey: 'property.error.notFound',
      })
      return
    }

    res.json(property)
  } catch (error) {
    logger.error('Failed to read property', { id, error })
    res.status(500).json({
      error: t('property.error.readFailed', undefined, {
        defaultValue: 'Failed to read property',
      }),
      errorKey: 'property.error.readFailed',
    })
  }
}
