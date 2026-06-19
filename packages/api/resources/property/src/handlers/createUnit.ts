import { count, create as dbCreate, findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateUnitInput, Property, PropertyUnit } from '../types.js'

/**
 * Creates a unit for a given property and updates the property's unitCount.
 * @param req - The request object with `id` param (property ID) and {@link CreateUnitInput} body.
 * @param res - The response object.
 */
export async function createUnit(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('property.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'property.error.unauthorized',
    })
    return
  }

  const propertyId = req.params.id as string
  const input = req.body as CreateUnitInput

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

    if (!input.name?.trim()) {
      res.status(400).json({
        error: t('property.error.unitNameRequired', undefined, {
          defaultValue: 'Unit name is required',
        }),
        errorKey: 'property.error.unitNameRequired',
      })
      return
    }

    const result = await dbCreate<PropertyUnit>('property_units', {
      propertyId,
      name: input.name.trim(),
      description: input.description ?? null,
      floor: input.floor ?? null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      maxOccupancy: input.maxOccupancy ?? null,
      areaSquareMetres: input.areaSquareMetres ?? null,
      isAvailable: input.isAvailable ?? true,
    })

    const unitCount = await count('property_units', [
      { field: 'propertyId', operator: '=', value: propertyId },
    ])
    await updateById('properties', propertyId, {
      unitCount,
      updatedAt: new Date().toISOString(),
    })

    logger.debug('Property unit created', { propertyId, unitId: result.data?.id })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create property unit', { propertyId, error })
    res.status(500).json({
      error: t('property.error.createUnitFailed', undefined, {
        defaultValue: 'Failed to create property unit',
      }),
      errorKey: 'property.error.createUnitFailed',
    })
  }
}
