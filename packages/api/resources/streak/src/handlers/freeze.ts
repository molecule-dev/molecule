/**
 * Manual-freeze handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { consumeFreeze } from '../service.js'
import type { StreakConfig } from '../types.js'

/**
 * Consumes one freeze for the authenticated user's streak, when the
 * configured cap allows. Returns the updated state and a
 * `freezeConsumed` flag.
 *
 * @param req - Express-compatible request.
 * @param res - Express-compatible response.
 */
export async function freeze(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const body = (req.body ?? {}) as {
    reset_after_hours?: number
    freezes_per_period?: number
  }

  const config: StreakConfig = {
    activity_kind: activityKind,
    reset_after_hours: body.reset_after_hours,
    freezes_per_period: body.freezes_per_period ?? 1,
  }

  try {
    const result = await consumeFreeze(userId, config)
    res.status(200).json(result)
  } catch (error) {
    logger.error('Failed to consume streak freeze', { userId, activityKind, error })
    res.status(500).json({
      error: t('streak.error.freezeFailed', undefined, {
        defaultValue: 'Failed to consume streak freeze',
      }),
      errorKey: 'streak.error.freezeFailed',
    })
  }
}
