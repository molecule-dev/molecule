/**
 * Create public share link handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { canAdministerResource } from '../authorizers/index.js'
import { createShareLink } from '../service.js'
import { createShareLinkSchema } from '../validation.js'

/**
 * Creates a public share link for a resource.
 *
 * @param req - The request with link body (resourceType, resourceId, role, expiresAt?).
 * @param res - The response object.
 */
export async function createLink(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = createShareLinkSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'share.error.validationFailed' })
    return
  }

  // Resource-ownership gate (default DENY): minting a public link expands a
  // resource's exposure exactly like a direct grant, so only a caller who
  // administers the target resource may create one. Without this, any
  // authenticated user could mint a link to ANY resource.
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
    const link = await createShareLink({ ...parsed.data, createdBy: userId })
    res.status(201).json(link)
  } catch (error) {
    logger.error('Failed to create share link', { userId, error })
    res.status(500).json({
      error: t('share.error.linkCreateFailed', undefined, {
        defaultValue: 'Failed to create share link',
      }),
      errorKey: 'share.error.linkCreateFailed',
    })
  }
}
