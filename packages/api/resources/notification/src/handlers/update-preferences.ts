/**
 * Update notification preferences handler.
 *
 * PUT /notifications/preferences — updates the user's notification preferences.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { setPreferences } from '@molecule/api-notification-center'

import type { AuthenticatedUser } from '../types.js'

/**
 * Handles PUT /notifications/preferences requests.
 *
 * @param req - Express request with preferences in body.
 * @param res - Express response.
 */
export async function updatePreferencesHandler(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthenticatedUser }).user
  await setPreferences(user.id, req.body as Record<string, unknown>)
  res.status(204).end()
}
