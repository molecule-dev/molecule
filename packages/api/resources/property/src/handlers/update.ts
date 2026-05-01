import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Property, UpdatePropertyInput } from '../types.js'

/**
 * Updates a property by ID. Only provided fields are modified.
 * @param req - The request object with `id` param and {@link UpdatePropertyInput} body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string
  const input = req.body as UpdatePropertyInput

  const property = await findById<Property>('properties', id)
  if (!property || property.deletedAt) {
    res.status(404).json({
      error: t('property.error.notFound', undefined, { defaultValue: 'Property not found' }),
      errorKey: 'property.error.notFound',
    })
    return
  }

  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.type !== undefined) data.type = input.type
  if (input.status !== undefined) data.status = input.status
  if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1
  if (input.addressLine2 !== undefined) data.addressLine2 = input.addressLine2
  if (input.city !== undefined) data.city = input.city
  if (input.region !== undefined) data.region = input.region
  if (input.postalCode !== undefined) data.postalCode = input.postalCode
  if (input.countryCode !== undefined) data.countryCode = input.countryCode.toUpperCase()
  if (input.latitude !== undefined) data.latitude = input.latitude
  if (input.longitude !== undefined) data.longitude = input.longitude
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl

  try {
    const result = await updateById<Property>('properties', id, data)
    logger.debug('Property updated', { id })
    res.json(result.data)
  } catch (error) {
    logger.error('Failed to update property', { id, error })
    res.status(500).json({
      error: t('property.error.updateFailed', undefined, {
        defaultValue: 'Failed to update property',
      }),
      errorKey: 'property.error.updateFailed',
    })
  }
}
