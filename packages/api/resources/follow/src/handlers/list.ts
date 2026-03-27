/**
 * List followers handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getFollowers } from '../service.js'

/**
 * Lists paginated followers of a target.
 *
 * @param req - The request with `targetType` and `targetId` params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { targetType, targetId } = req.params
  if (!targetType || !targetId) {
    res.status(400).json({
      error: t('follow.error.missingTarget', undefined, {
        defaultValue: 'Target type and ID are required',
      }),
      errorKey: 'follow.error.missingTarget',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getFollowers(targetType, targetId, { limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list followers', { targetType, targetId, error })
    res.status(500).json({
      error: t('follow.error.listFailed', undefined, {
        defaultValue: 'Failed to list followers',
      }),
      errorKey: 'follow.error.listFailed',
    })
  }
}
