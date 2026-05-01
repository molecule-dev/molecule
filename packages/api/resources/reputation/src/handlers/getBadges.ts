/**
 * Get-badges handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { listBadges } from '../service.js'

/**
 * Returns the list of badges awarded to the user identified by the
 * `:id` route param, newest first. Public — no authentication required.
 *
 * @param req - Express-compatible request.
 * @param res - Express-compatible response.
 */
export async function getBadges(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    const badges = await listBadges(userId)
    res.status(200).json(badges)
  } catch (error) {
    logger.error('Failed to list badges', { userId, error })
    res.status(500).json({
      error: t('reputation.error.badgesFailed', undefined, {
        defaultValue: 'Failed to list badges',
      }),
      errorKey: 'reputation.error.badgesFailed',
    })
  }
}
