import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Property, PropertyAmenity } from '../types.js'

/**
 * Lists all amenities for a given property.
 * @param req - The request object with `id` param (property ID).
 * @param res - The response object.
 */
export async function listAmenities(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const propertyId = req.params.id as string

  try {
    const property = await findById<Property>('properties', propertyId)
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId
    // Visibility (P5RES-1): sub-resources of a non-active property are owner-only.
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

    const amenities = await findMany<PropertyAmenity>('property_amenities', {
      where: [{ field: 'propertyId', operator: '=', value: propertyId }],
      orderBy: [{ field: 'code', direction: 'asc' }],
    })

    res.json(amenities)
  } catch (error) {
    logger.error('Failed to list property amenities', { propertyId, error })
    res.status(500).json({
      error: t('property.error.listAmenitiesFailed', undefined, {
        defaultValue: 'Failed to list property amenities',
      }),
      errorKey: 'property.error.listAmenitiesFailed',
    })
  }
}
