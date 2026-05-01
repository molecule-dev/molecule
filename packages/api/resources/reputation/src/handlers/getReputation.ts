/**
 * Get-reputation handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getScore } from '../service.js'

/**
 * Returns the public reputation snapshot for the user identified by
 * the `:id` route param. Public — no authentication required.
 *
 * @param req - Express-compatible request.
 * @param res - Express-compatible response.
 */
export async function getReputation(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = req.params.id
  if (!userId) {
    res.status(400).json({
      error: t('reputation.error.missingUserId', undefined, {
        defaultValue: 'userId is required',
      }),
      errorKey: 'reputation.error.missingUserId',
    })
    return
  }

  try {
    const score = await getScore(userId)
    res.status(200).json(score)
  } catch (error) {
    logger.error('Failed to read reputation score', { userId, error })
    res.status(500).json({
      error: t('reputation.error.readFailed', undefined, {
        defaultValue: 'Failed to read reputation',
      }),
      errorKey: 'reputation.error.readFailed',
    })
  }
}
