/**
 * Get reaction summary handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getReactionSummary } from '../service.js'

/**
 * Returns a reaction summary for a resource, including counts per type
 * and the current user's reactions (if authenticated).
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const userId = (res.locals.session as { userId?: string } | undefined)?.userId

  try {
    const summary = await getReactionSummary(resourceType, resourceId, userId)
    res.json(summary)
  } catch (error) {
    logger.error('Failed to get reactions', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('reaction.error.listFailed', undefined, {
        defaultValue: 'Failed to get reactions',
      }),
      errorKey: 'reaction.error.listFailed',
    })
  }
}
