/**
 * Read address handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getAddress } from '../service.js'

/**
 * Reads a single address owned by the current user.
 *
 * @param req - The request with `id` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  try {
    const address = await getAddress(userId, id)
    if (!address) {
      res.status(404).json({
        error: t('address.error.notFound', undefined, { defaultValue: 'Address not found' }),
        errorKey: 'address.error.notFound',
      })
      return
    }
    res.json(address)
  } catch (error) {
    logger.error('Failed to read address', { userId, id, error })
    res.status(500).json({
      error: t('address.error.readFailed', undefined, {
        defaultValue: 'Failed to read address',
      }),
      errorKey: 'address.error.readFailed',
    })
  }
}
