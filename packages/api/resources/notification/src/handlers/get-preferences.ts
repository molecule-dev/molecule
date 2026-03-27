/**
 * Get notification preferences handler.
 *
 * GET /notifications/preferences — returns the user's notification preferences.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { getPreferences } from '@molecule/api-notification-center'

import type { AuthenticatedUser } from '../types.js'

/**
 * Handles GET /notifications/preferences requests.
 *
 * @param req - Express request with authenticated user.
 * @param res - Express response.
 */
export async function getPreferencesHandler(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthenticatedUser }).user
  const preferences = await getPreferences(user.id)
  res.json(preferences)
}
