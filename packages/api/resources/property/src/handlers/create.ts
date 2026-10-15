import { create as dbCreate } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import { slugify, uniqueSlugInTable } from '@molecule/api-slug'

import type { CreatePropertyInput, Property } from '../types.js'

/**
 * Creates a new property with a unique slug derived from the name.
 * @param req - The incoming request with {@link CreatePropertyInput} body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('property.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'property.error.unauthorized',
    })
    return
  }

  const input = req.body as CreatePropertyInput

  if (!input.name?.trim()) {
    res.status(400).json({
      error: t('property.error.nameRequired', undefined, {
        defaultValue: 'Property name is required',
      }),
      errorKey: 'property.error.nameRequired',
    })
    return
  }

  if (!input.addressLine1?.trim() || !input.city?.trim() || !input.countryCode?.trim()) {
    res.status(400).json({
      error: t('property.error.addressRequired', undefined, {
        defaultValue: 'Address line 1, city, and country code are required',
      }),
      errorKey: 'property.error.addressRequired',
    })
    return
  }

  let slug = slugify(input.name, { maxLength: 255 })
  if (!slug) {
    res.status(400).json({
      error: t('property.error.invalidName', undefined, {
        defaultValue: 'Property name is invalid',
      }),
      errorKey: 'property.error.invalidName',
    })
    return
  }

  // The plain slug, or the next free one (name-2, name-3 …): `@molecule/api-slug`.
  slug = await uniqueSlugInTable('properties', 'slug', input.name, { maxLength: 255 })

  try {
    const result = await dbCreate<Property>('properties', {
      ownerId: userId,
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      type: input.type ?? 'apartment',
      status: input.status ?? 'draft',
      addressLine1: input.addressLine1.trim(),
      addressLine2: input.addressLine2 ?? null,
      city: input.city.trim(),
      region: input.region ?? null,
      postalCode: input.postalCode ?? null,
      countryCode: input.countryCode.trim().toUpperCase(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      unitCount: 0,
      coverImageUrl: input.coverImageUrl ?? null,
    })

    logger.debug('Property created', { propertyId: result.data?.id, slug })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to create property', { slug, error })
    res.status(500).json({
      error: t('property.error.createFailed', undefined, {
        defaultValue: 'Failed to create property',
      }),
      errorKey: 'property.error.createFailed',
    })
  }
}
