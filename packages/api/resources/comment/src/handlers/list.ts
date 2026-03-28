/**
 * List comments handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getCommentsByResource } from '../service.js'

/**
 * Lists paginated top-level comments for a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('comment.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'comment.error.missingResource',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getCommentsByResource(resourceType, resourceId, { limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list comments', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('comment.error.listFailed', undefined, {
        defaultValue: 'Failed to list comments',
      }),
      errorKey: 'comment.error.listFailed',
    })
  }
}
