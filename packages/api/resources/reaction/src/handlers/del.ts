/**
 * Remove reaction handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { removeReaction } from '../service.js'

/**
 * Removes a user's reaction from a resource. Optionally removes only a specific
 * reaction type via query parameter.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
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

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('reaction.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'reaction.error.missingResource',
    })
    return
  }

  const type = req.query.type as string | undefined

  try {
    await removeReaction(resourceType, resourceId, userId, type)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to remove reaction', { resourceType, resourceId, userId, error })
    res.status(500).json({
      error: t('reaction.error.deleteFailed', undefined, {
        defaultValue: 'Failed to remove reaction',
      }),
      errorKey: 'reaction.error.deleteFailed',
    })
  }
}
