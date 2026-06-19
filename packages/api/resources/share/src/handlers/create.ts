/**
 * Grant share handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { canAdministerResource } from '../authorizers/index.js'
import { grantShare } from '../service.js'
import { grantShareSchema } from '../validation.js'

/**
 * Grants a share on a resource. Idempotent — re-granting to the same
 * principal updates the existing role/expiry instead of duplicating.
 *
 * @param req - The request with grant body (resourceType, resourceId, principalType, principalId, role, expiresAt?).
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

  const parsed = grantShareSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'share.error.validationFailed' })
    return
  }

  // Resource-ownership gate (default DENY): only a caller who administers the
  // target resource may hand out access to it. Without this, any authenticated
  // user could grant themselves any role on any resource.
  if (!(await canAdministerResource(parsed.data.resourceType, parsed.data.resourceId, userId))) {
    res.status(403).json({
      error: t('share.error.forbidden', undefined, {
        defaultValue: 'You are not allowed to manage shares on this resource',
      }),
      errorKey: 'share.error.forbidden',
    })
    return
  }

  try {
    const share = await grantShare({
      ...parsed.data,
      grantedBy: userId,
    })
    res.status(201).json(share)
  } catch (error) {
    logger.error('Failed to grant share', { userId, error })
    res.status(500).json({
      error: t('share.error.grantFailed', undefined, {
        defaultValue: 'Failed to grant share',
      }),
      errorKey: 'share.error.grantFailed',
    })
  }
}
