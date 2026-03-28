/**
 * Unread count handler.
 *
 * GET /notifications/unread-count — returns the unread notification count.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { getUnreadCount } from '@molecule/api-notification-center'

import type { AuthenticatedUser } from '../types.js'

/**
 * Handles GET /notifications/unread-count requests.
 *
 * @param req - Express request with authenticated user.
 * @param res - Express response.
 */
export async function unreadCount(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthenticatedUser }).user
  const count = await getUnreadCount(user.id)
  res.json({ count })
}
