import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Property, PropertyPhoto } from '../types.js'

/**
 * Lists all photos for a given property, ordered by position then creation time.
 * @param req - The request object with `id` param (property ID).
 * @param res - The response object.
 */
export async function listPhotos(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const propertyId = req.params.id as string

  try {
    const property = await findById<Property>('properties', propertyId)
    if (!property || property.deletedAt) {
      res.status(404).json({
        error: t('property.error.notFound', undefined, { defaultValue: 'Property not found' }),
        errorKey: 'property.error.notFound',
      })
      return
    }

    const photos = await findMany<PropertyPhoto>('property_photos', {
      where: [{ field: 'propertyId', operator: '=', value: propertyId }],
      orderBy: [
        { field: 'position', direction: 'asc' },
        { field: 'createdAt', direction: 'asc' },
      ],
    })

    res.json(photos)
  } catch (error) {
    logger.error('Failed to list property photos', { propertyId, error })
    res.status(500).json({
      error: t('property.error.listPhotosFailed', undefined, {
        defaultValue: 'Failed to list property photos',
      }),
      errorKey: 'property.error.listPhotosFailed',
    })
  }
}
