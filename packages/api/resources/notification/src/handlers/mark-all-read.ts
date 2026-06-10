/**
 * Mark all notifications as read handler.
 *
 * POST /notifications/read-all — marks all notifications as read for the user.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { markAllRead } from '@molecule/api-notification-center'

import { getSessionUserId } from '../utilities.js'

/**
 * Handles POST /notifications/read-all requests.
 *
 * @param req - Express request with authenticated user.
 * @param res - Express response.
 */
export async function markAllReadHandler(_req: Request, res: Response): Promise<void> {
  const userId = getSessionUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  await markAllRead(userId)
  res.status(204).end()
}
