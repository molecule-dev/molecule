/**
 * Manual-freeze handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { resolveStreakConfig } from '../config-registry.js'
import { consumeFreeze } from '../service.js'

/**
 * Consumes one freeze for the authenticated user's streak, when the
 * server-resolved config allows. Returns the updated state and a
 * `freezeConsumed` flag.
 *
 * Server-authoritative: the freeze cap (`freezes_per_period`) is resolved on
 * the SERVER ({@link resolveStreakConfig}), never read from the request body —
 * a client cannot raise its own cap to burn unlimited freezes. With no resolver
 * registered the cap defaults to `0`, so this endpoint is a no-op until the app
 * explicitly grants freezes.
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

  try {
    const config = await resolveStreakConfig({ activityKind, userId })
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
