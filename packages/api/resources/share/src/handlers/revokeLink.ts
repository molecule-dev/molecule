/**
 * Revoke public share link handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { revokeShareLink } from '../service.js'

/**
 * Revokes a public share link by ID. Idempotent.
 *
 * @param req - The request with link `id` param.
 * @param res - The response object.
 */
export async function revokeLink(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    const link = await revokeShareLink(id)
    if (!link) {
      res.status(404).json({
        error: t('share.error.linkNotFound', undefined, {
          defaultValue: 'Share link not found',
        }),
        errorKey: 'share.error.linkNotFound',
      })
      return
    }
    res.json(link)
  } catch (error) {
    logger.error('Failed to revoke share link', { userId, id, error })
    res.status(500).json({
      error: t('share.error.linkRevokeFailed', undefined, {
        defaultValue: 'Failed to revoke share link',
      }),
      errorKey: 'share.error.linkRevokeFailed',
    })
  }
}
