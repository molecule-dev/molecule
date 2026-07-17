/**
 * Record-activity handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { resolveStreakConfig } from '../config-registry.js'
import { recordActivity } from '../service.js'

/**
 * Records an activity event for the authenticated user under the
 * `:activityKind` route param.
 *
 * Server-authoritative by design: the request body is NOT read. The streak
 * config (reset window, freeze cap) is resolved on the SERVER
 * ({@link resolveStreakConfig}) and the event timestamp is the server clock —
 * so a client can only signal "I did this activity now", never the resulting
 * streak count/longest or the levers (`reset_after_hours`, `freezes_per_period`,
 * `when`) that would let it inflate its own streak.
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

  try {
    const config = await resolveStreakConfig({ activityKind, userId })
    // Server clock — never a client-supplied `when`. A forged timestamp is the
    // primary streak-inflation vector (stage many "days" in one request burst).
    const result = await recordActivity(userId, config, new Date())
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
