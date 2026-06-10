/**
 * Unread count handler.
 *
 * GET /notifications/unread-count — returns the unread notification count.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { getUnreadCount } from '@molecule/api-notification-center'

import { getSessionUserId } from '../utilities.js'

/**
 * Handles GET /notifications/unread-count requests.
 *
 * @param req - Express request with authenticated user.
 * @param res - Express response.
 */
export async function unreadCount(_req: Request, res: Response): Promise<void> {
  const userId = getSessionUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const count = await getUnreadCount(userId)
  res.json({ count })
}
