/**
 * Revoke public share link handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { canAdministerResource } from '../authorizers/index.js'
import { getShareLinkById, revokeShareLink } from '../service.js'

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

  // Resolve the link first to learn which resource it exposes, then assert the
  // caller administers THAT resource (default DENY). This blocks an attacker
  // from revoking a link on a resource they don't administer by its id.
  const existing = await getShareLinkById(id)
  if (!existing) {
    res.status(404).json({
      error: t('share.error.linkNotFound', undefined, {
        defaultValue: 'Share link not found',
      }),
      errorKey: 'share.error.linkNotFound',
    })
    return
  }

  if (!(await canAdministerResource(existing.resourceType, existing.resourceId, userId))) {
    res.status(403).json({
      error: t('share.error.forbidden', undefined, {
        defaultValue: 'You are not allowed to manage shares on this resource',
      }),
      errorKey: 'share.error.forbidden',
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
