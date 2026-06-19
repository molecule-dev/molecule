/**
 * Mark notification as read handler.
 *
 * POST /notifications/:id/read — marks a single notification as read for the
 * authenticated owner only.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { markRead } from '@molecule/api-notification-center'

import { getSessionUserId } from '../utilities.js'

/**
 * Handles POST /notifications/:id/read requests.
 *
 * Requires an authenticated session and only affects the requester's own
 * notification — a notification belonging to another user (or a non-existent
 * id) yields a 404, never silently mutating someone else's row (IDOR).
 *
 * @param req - Express request with notification id param.
 * @param res - Express response.
 */
export async function markReadHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  const userId = getSessionUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const updated = await markRead(userId, req.params.id)
  if (!updated) {
    res.status(404).json({ error: 'Not Found' })
    return
  }

  res.status(204).end()
}
