/**
 * Update share handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { canAdministerResource } from '../authorizers/index.js'
import { getShareById, updateShare } from '../service.js'
import { updateShareSchema } from '../validation.js'

/**
 * Updates an existing share's role and/or expiry.
 *
 * @param req - The request with share `id` param and patch body.
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
      error: t('share.error.missingId', undefined, { defaultValue: 'Share ID is required' }),
      errorKey: 'share.error.missingId',
    })
    return
  }

  const parsed = updateShareSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'share.error.validationFailed' })
    return
  }

  // Resolve the share first to learn which resource it grants on, then assert
  // the caller administers THAT resource (default DENY). This blocks an
  // attacker from escalating/altering someone else's grant by its id.
  const existing = await getShareById(id)
  if (!existing) {
    res.status(404).json({
      error: t('share.error.notFound', undefined, { defaultValue: 'Share not found' }),
      errorKey: 'share.error.notFound',
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
    const share = await updateShare(id, parsed.data)
    if (!share) {
      res.status(404).json({
        error: t('share.error.notFound', undefined, { defaultValue: 'Share not found' }),
        errorKey: 'share.error.notFound',
      })
      return
    }
    res.json(share)
  } catch (error) {
    logger.error('Failed to update share', { userId, id, error })
    res.status(500).json({
      error: t('share.error.updateFailed', undefined, {
        defaultValue: 'Failed to update share',
      }),
      errorKey: 'share.error.updateFailed',
    })
  }
}
