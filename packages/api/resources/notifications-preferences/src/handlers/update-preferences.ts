/**
 * PUT /me/notification-preferences handler.
 *
 * Accepts a partial type→channel-toggles map and merges it into the user's
 * stored preferences. Returns the fully-merged map after the update.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { updatePreferences } from '../service.js'
import type { NotificationChannelToggles, NotificationPreferencesPatch } from '../types.js'

const ALLOWED_CHANNELS: ReadonlyArray<keyof NotificationChannelToggles> = [
  'email',
  'push',
  'sms',
  'inApp',
]

/**
 * Validates and normalises the request body into a `NotificationPreferencesPatch`.
 *
 * Returns `null` if the body is not a plain object, contains a non-object
 * entry per type, or contains channel values that are not booleans.
 *
 * @param body - The raw request body.
 * @returns The validated patch, or `null` when invalid.
 */
function parsePatch(body: unknown): NotificationPreferencesPatch | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null

  const patch: NotificationPreferencesPatch = {}
  for (const [type, raw] of Object.entries(body as Record<string, unknown>)) {
    if (!type) return null
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const partial: Partial<NotificationChannelToggles> = {}
    for (const [channel, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!ALLOWED_CHANNELS.includes(channel as keyof NotificationChannelToggles)) return null
      if (typeof value !== 'boolean') return null
      partial[channel as keyof NotificationChannelToggles] = value
    }
    patch[type] = partial
  }
  return patch
}

/**
 * Merges a partial preferences patch into the current user's stored map.
 *
 * @param req - The authenticated request with a partial preferences body.
 * @param res - The response object.
 */
export async function updatePreferencesHandler(
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

  const patch = parsePatch(req.body)
  if (!patch) {
    res.status(400).json({
      error: t('notificationsPreferences.error.validationFailed', undefined, {
        defaultValue: 'Invalid notification preferences payload',
      }),
      errorKey: 'notificationsPreferences.error.validationFailed',
    })
    return
  }

  try {
    const preferences = await updatePreferences(userId, patch)
    res.json({ preferences })
  } catch (error) {
    logger.error('Failed to update notification preferences', { userId, error })
    res.status(500).json({
      error: t('notificationsPreferences.error.updateFailed', undefined, {
        defaultValue: 'Failed to update notification preferences',
      }),
      errorKey: 'notificationsPreferences.error.updateFailed',
    })
  }
}
