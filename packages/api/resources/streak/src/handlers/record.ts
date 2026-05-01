/**
 * Record-activity handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { recordActivity } from '../service.js'
import type { StreakConfig } from '../types.js'

/**
 * Records an activity event for the authenticated user under the
 * `:activityKind` route param. Optional body fields override default
 * config (`reset_after_hours`, `freezes_per_period`, `when` ISO).
 *
 * @param req - Express-compatible request.
 * @param res - Express-compatible response.
 */
export async function record(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    when?: string
  }

  const config: StreakConfig = {
    activity_kind: activityKind,
    reset_after_hours: body.reset_after_hours,
    freezes_per_period: body.freezes_per_period,
  }

  const when = body.when ? new Date(body.when) : new Date()
  if (Number.isNaN(when.getTime())) {
    res.status(400).json({
      error: t('streak.error.invalidWhen', undefined, {
        defaultValue: 'Invalid `when` timestamp',
      }),
      errorKey: 'streak.error.invalidWhen',
    })
    return
  }

  try {
    const result = await recordActivity(userId, config, when)
    res.status(200).json(result)
  } catch (error) {
    logger.error('Failed to record streak activity', { userId, activityKind, error })
    res.status(500).json({
      error: t('streak.error.recordFailed', undefined, {
        defaultValue: 'Failed to record streak activity',
      }),
      errorKey: 'streak.error.recordFailed',
    })
  }
}
