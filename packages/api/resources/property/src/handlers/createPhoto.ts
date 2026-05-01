import { create as dbCreate, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreatePhotoInput, Property, PropertyPhoto } from '../types.js'

/**
 * Creates a photo for a given property.
 * @param req - The request object with `id` param (property ID) and {@link CreatePhotoInput} body.
 * @param res - The response object.
 */
export async function createPhoto(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const propertyId = req.params.id as string
  const input = req.body as CreatePhotoInput

  try {
    const property = await findById<Property>('properties', propertyId)
    if (!property || property.deletedAt) {
      res.status(404).json({
        error: t('property.error.notFound', undefined, { defaultValue: 'Property not found' }),
        errorKey: 'property.error.notFound',
      })
      return
    }

    if (!input.url?.trim()) {
      res.status(400).json({
        error: t('property.error.photoUrlRequired', undefined, {
          defaultValue: 'Photo URL is required',
        }),
        errorKey: 'property.error.photoUrlRequired',
      })
      return
    }

    const result = await dbCreate<PropertyPhoto>('property_photos', {
      propertyId,
      url: input.url.trim(),
      caption: input.caption ?? null,
      position: input.position ?? 0,
    })

    logger.debug('Property photo created', { propertyId, photoId: result.data?.id })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create property photo', { propertyId, error })
    res.status(500).json({
      error: t('property.error.createPhotoFailed', undefined, {
        defaultValue: 'Failed to create property photo',
      }),
      errorKey: 'property.error.createPhotoFailed',
    })
  }
}
