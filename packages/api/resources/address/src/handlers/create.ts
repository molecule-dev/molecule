/**
 * Create address handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { createAddress } from '../service.js'
import { createAddressSchema } from '../validation.js'

/**
 * Creates a new address for the current user.
 *
 * @param req - The request with the address body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = createAddressSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'address.error.validationFailed' })
    return
  }

  try {
    const address = await createAddress({
      userId,
      label: parsed.data.label ?? null,
      recipientName: parsed.data.recipientName,
      line1: parsed.data.line1,
      line2: parsed.data.line2 ?? null,
      city: parsed.data.city,
      region: parsed.data.region ?? null,
      postalCode: parsed.data.postalCode,
      countryIso: parsed.data.countryIso,
      phone: parsed.data.phone ?? null,
      isDefaultShipping: parsed.data.isDefaultShipping ?? false,
      isDefaultBilling: parsed.data.isDefaultBilling ?? false,
    })
    res.status(201).json(address)
  } catch (error) {
    logger.error('Failed to create address', { userId, error })
    res.status(500).json({
      error: t('address.error.createFailed', undefined, {
        defaultValue: 'Failed to create address',
      }),
      errorKey: 'address.error.createFailed',
    })
  }
}
