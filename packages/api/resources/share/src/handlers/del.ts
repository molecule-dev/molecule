/**
 * Revoke share handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { revokeShareById } from '../service.js'

/**
 * Revokes a share grant by its ID.
 *
 * @param req - The request with share `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
      error: t('share.error.missingId', undefined, { defaultValue: 'Share ID is required' }),
      errorKey: 'share.error.missingId',
    })
    return
  }

  try {
    await revokeShareById(id)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to revoke share', { userId, id, error })
    res.status(500).json({
      error: t('share.error.revokeFailed', undefined, {
        defaultValue: 'Failed to revoke share',
      }),
      errorKey: 'share.error.revokeFailed',
    })
  }
}
