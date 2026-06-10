/**
 * Get notification preferences handler.
 *
 * GET /notifications/preferences — returns the user's notification preferences.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { getPreferences } from '@molecule/api-notification-center'

import { getSessionUserId } from '../utilities.js'

/**
 * Handles GET /notifications/preferences requests.
 *
 * @param req - Express request with authenticated user.
 * @param res - Express response.
 */
export async function getPreferencesHandler(_req: Request, res: Response): Promise<void> {
  const userId = getSessionUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const preferences = await getPreferences(userId)
  res.json(preferences)
}
