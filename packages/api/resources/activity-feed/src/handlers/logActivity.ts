/**
 * Log activity handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { logActivity } from '../service.js'
import { createActivitySchema } from '../validation.js'

/**
 * Logs a new activity to the feed.
 *
 * @param req - The request with activity creation body.
 * @param res - The response object.
 */
export async function log(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = createActivitySchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'activityFeed.error.validationFailed' })
    return
  }

  try {
    const activity = await logActivity(parsed.data)
    res.status(201).json(activity)
  } catch (error) {
    logger.error('Failed to log activity', { userId, error })
    res.status(500).json({
      error: t('activityFeed.error.logFailed', undefined, {
        defaultValue: 'Failed to log activity',
      }),
      errorKey: 'activityFeed.error.logFailed',
    })
  }
}
