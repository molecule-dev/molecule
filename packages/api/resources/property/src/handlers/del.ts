import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Property } from '../types.js'

/**
 * Soft-deletes a property by setting its `deletedAt` timestamp.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  const property = await findById<Property>('properties', id)
  if (!property || property.deletedAt) {
    res.status(404).json({
      error: t('property.error.notFound', undefined, { defaultValue: 'Property not found' }),
      errorKey: 'property.error.notFound',
    })
    return
  }

  try {
    await updateById('properties', id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    logger.debug('Property soft-deleted', { id })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete property', { id, error })
    res.status(500).json({
      error: t('property.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete property',
      }),
      errorKey: 'property.error.deleteFailed',
    })
  }
}
