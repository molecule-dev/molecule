/**
 * Mark activities seen handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { markSeen } from '../service.js'
import { markSeenSchema } from '../validation.js'

/**
 * Marks activities as seen for the authenticated user up to a given activity ID.
 *
 * @param req - The request with `upToId` in body.
 * @param res - The response object.
 */
export async function seen(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = markSeenSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'activityFeed.error.validationFailed' })
    return
  }

  try {
    await markSeen(userId, parsed.data.upToId)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to mark activities as seen', { userId, error })
    res.status(500).json({
      error: t('activityFeed.error.markSeenFailed', undefined, {
        defaultValue: 'Failed to mark activities as seen',
      }),
      errorKey: 'activityFeed.error.markSeenFailed',
    })
  }
}
