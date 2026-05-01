/**
 * Create public share link handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

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
