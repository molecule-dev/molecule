/**
 * Read-streak handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getStreak } from '../service.js'

/**
 * Reads the current streak state for the authenticated user under
 * the `:activityKind` route param.
 *
 * @param req - Express-compatible request.
 * @param res - Express-compatible response.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const activityKind = req.params.activityKind
  if (!activityKind) {
    res.status(400).json({
      error: t('streak.error.missingActivityKind', undefined, {
        defaultValue: 'activity_kind is required',
      }),
      errorKey: 'streak.error.missingActivityKind',
    })
    return
  }

  try {
    const state = await getStreak(userId, activityKind)
    res.status(200).json(state)
  } catch (error) {
    logger.error('Failed to read streak', { userId, activityKind, error })
    res.status(500).json({
      error: t('streak.error.readFailed', undefined, {
        defaultValue: 'Failed to read streak',
      }),
      errorKey: 'streak.error.readFailed',
    })
  }
}
