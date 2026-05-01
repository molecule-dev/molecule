/**
 * Update address handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { setDefault, updateAddress } from '../service.js'
import { setDefaultAddressSchema, updateAddressSchema } from '../validation.js'

/**
 * Updates an address owned by the current user.
 *
 * @param req - The request with `id` param and patch body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id } = req.params
  if (!id) {
    res.status(400).json({
      error: t('address.error.missingId', undefined, {
        defaultValue: 'Address id is required',
      }),
      errorKey: 'address.error.missingId',
    })
    return
  }

  const parsed = updateAddressSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'address.error.validationFailed' })
    return
  }

  try {
    const address = await updateAddress(userId, id, parsed.data)
    if (!address) {
      res.status(404).json({
        error: t('address.error.notFound', undefined, { defaultValue: 'Address not found' }),
        errorKey: 'address.error.notFound',
      })
      return
    }
    res.json(address)
  } catch (error) {
    logger.error('Failed to update address', { userId, id, error })
    res.status(500).json({
      error: t('address.error.updateFailed', undefined, {
        defaultValue: 'Failed to update address',
      }),
      errorKey: 'address.error.updateFailed',
    })
  }
}

/**
 * Sets an address as the user's default for either shipping or billing.
 *
 * @param req - The request with `id` param and `kind` body field.
 * @param res - The response object.
 */
export async function setAsDefault(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id } = req.params
  if (!id) {
    res.status(400).json({
      error: t('address.error.missingId', undefined, {
        defaultValue: 'Address id is required',
      }),
      errorKey: 'address.error.missingId',
    })
    return
  }

  const parsed = setDefaultAddressSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'address.error.validationFailed' })
    return
  }

  try {
    const ok = await setDefault(userId, id, parsed.data.kind)
    if (!ok) {
      res.status(404).json({
        error: t('address.error.notFound', undefined, { defaultValue: 'Address not found' }),
        errorKey: 'address.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to set default address', { userId, id, error })
    res.status(500).json({
      error: t('address.error.setDefaultFailed', undefined, {
        defaultValue: 'Failed to set default address',
      }),
      errorKey: 'address.error.setDefaultFailed',
    })
  }
}
