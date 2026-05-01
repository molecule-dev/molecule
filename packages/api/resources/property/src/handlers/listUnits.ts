import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Property, PropertyUnit } from '../types.js'

/**
 * Lists all units for a given property.
 * @param req - The request object with `id` param (property ID).
 * @param res - The response object.
 */
export async function listUnits(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

    const units = await findMany<PropertyUnit>('property_units', {
      where: [{ field: 'propertyId', operator: '=', value: propertyId }],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    })

    res.json(units)
  } catch (error) {
    logger.error('Failed to list property units', { propertyId, error })
    res.status(500).json({
      error: t('property.error.listUnitsFailed', undefined, {
        defaultValue: 'Failed to list property units',
      }),
      errorKey: 'property.error.listUnitsFailed',
    })
  }
}
