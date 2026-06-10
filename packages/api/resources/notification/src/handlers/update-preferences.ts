/**
 * Update notification preferences handler.
 *
 * PUT /notifications/preferences — updates the user's notification preferences.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { setPreferences } from '@molecule/api-notification-center'

import { getSessionUserId } from '../utilities.js'

/**
 * Handles PUT /notifications/preferences requests.
 *
 * @param req - Express request with preferences in body.
 * @param res - Express response.
 */
export async function updatePreferencesHandler(req: Request, res: Response): Promise<void> {
  const userId = getSessionUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  await setPreferences(userId, req.body as Record<string, unknown>)
  res.status(204).end()
}
