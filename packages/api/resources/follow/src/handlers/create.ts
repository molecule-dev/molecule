/**
 * Follow handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { follow } from '../service.js'

/**
 * Creates a follow relationship. Idempotent.
 *
 * @param req - The request with `targetType` and `targetId` params.
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

  try {
    const result = await follow(userId, targetType, targetId)
    res.status(201).json(result)
  } catch (error) {
    logger.error('Failed to follow', { userId, targetType, targetId, error })
    res.status(500).json({
      error: t('follow.error.createFailed', undefined, { defaultValue: 'Failed to follow' }),
      errorKey: 'follow.error.createFailed',
    })
  }
}
