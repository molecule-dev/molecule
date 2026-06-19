import { create as dbCreate, findById, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateAmenityInput, Property, PropertyAmenity } from '../types.js'

/**
 * Creates an amenity for a given property. Amenity codes are unique per property.
 * @param req - The request object with `id` param (property ID) and {@link CreateAmenityInput} body.
 * @param res - The response object.
 */
export async function createAmenity(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('property.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'property.error.unauthorized',
    })
    return
  }

  const propertyId = req.params.id as string
  const input = req.body as CreateAmenityInput

  try {
    const property = await findById<Property>('properties', propertyId)
    if (!property || property.deletedAt) {
      res.status(404).json({
        error: t('property.error.notFound', undefined, { defaultValue: 'Property not found' }),
        errorKey: 'property.error.notFound',
      })
      return
    }

    if (property.ownerId !== userId) {
      res.status(403).json({
        error: t('property.error.forbidden', undefined, {
          defaultValue: 'You do not have access to this property',
        }),
        errorKey: 'property.error.forbidden',
      })
      return
    }

    if (!input.code?.trim() || !input.label?.trim()) {
      res.status(400).json({
        error: t('property.error.amenityFieldsRequired', undefined, {
          defaultValue: 'Amenity code and label are required',
        }),
        errorKey: 'property.error.amenityFieldsRequired',
      })
      return
    }

    const code = input.code.trim().toLowerCase()
    const existing = await findOne('property_amenities', [
      { field: 'propertyId', operator: '=', value: propertyId },
      { field: 'code', operator: '=', value: code },
    ])
    if (existing) {
      res.status(409).json({
        error: t('property.error.amenityExists', undefined, {
          defaultValue: 'Amenity with this code already exists for this property',
        }),
        errorKey: 'property.error.amenityExists',
      })
      return
    }

    const result = await dbCreate<PropertyAmenity>('property_amenities', {
      propertyId,
      code,
      label: input.label.trim(),
    })

    logger.debug('Property amenity created', { propertyId, amenityId: result.data?.id })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create property amenity', { propertyId, error })
    res.status(500).json({
      error: t('property.error.createAmenityFailed', undefined, {
        defaultValue: 'Failed to create property amenity',
      }),
      errorKey: 'property.error.createAmenityFailed',
    })
  }
}
