/**
 * List public share links handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { listShareLinks } from '../service.js'

/**
 * Lists all public share links attached to a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function listLinks(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('share.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'share.error.missingResource',
    })
    return
  }

  try {
    const links = await listShareLinks(resourceType, resourceId)
    res.json({ data: links })
  } catch (error) {
    logger.error('Failed to list share links', { userId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('share.error.linkListFailed', undefined, {
        defaultValue: 'Failed to list share links',
      }),
      errorKey: 'share.error.linkListFailed',
    })
  }
}
