/**
 * GET /me/notification-preferences handler.
 *
 * Returns the current user's stored preferences map. An empty object means
 * the user has never customised their preferences — callers should treat
 * unspecified types/channels as enabled (use the `isEnabled()` service
 * helper rather than inspecting the map directly).
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getPreferences } from '../service.js'

/**
 * Returns the current user's notification preferences map.
 *
 * @param req - The authenticated request.
 * @param res - The response object.
 */
export async function getPreferencesHandler(
  req: MoleculeRequest,
  res: MoleculeResponse,
): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  try {
    const preferences = await getPreferences(userId)
    res.json({ preferences })
  } catch (error) {
    logger.error('Failed to load notification preferences', { userId, error })
    res.status(500).json({
      error: t('notificationsPreferences.error.loadFailed', undefined, {
        defaultValue: 'Failed to load notification preferences',
      }),
      errorKey: 'notificationsPreferences.error.loadFailed',
    })
  }
}
