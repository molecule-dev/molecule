import { create as dbCreate, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreatePropertyInput, Property } from '../types.js'

/**
 * Converts a string to a URL-friendly slug.
 * @param name - The string to slugify.
 * @returns The slugified string.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Creates a new property with a unique slug derived from the name.
 * @param req - The incoming request with {@link CreatePropertyInput} body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  let slug = slugify(input.name)
  if (!slug) {
    res.status(400).json({
      error: t('property.error.invalidName', undefined, {
        defaultValue: 'Property name is invalid',
      }),
      errorKey: 'property.error.invalidName',
    })
    return
  }

  const existing = await findOne('properties', [{ field: 'slug', operator: '=', value: slug }])
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  try {
    const result = await dbCreate<Property>('properties', {
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
