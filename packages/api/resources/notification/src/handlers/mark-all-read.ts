/**
 * Mark all notifications as read handler.
 *
 * POST /notifications/read-all — marks all notifications as read for the user.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { markAllRead } from '@molecule/api-notification-center'

import type { AuthenticatedUser } from '../types.js'

/**
 * Handles POST /notifications/read-all requests.
 *
 * @param req - Express request with authenticated user.
 * @param res - Express response.
 */
export async function markAllReadHandler(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthenticatedUser }).user
  await markAllRead(user.id)
  res.status(204).end()
}
