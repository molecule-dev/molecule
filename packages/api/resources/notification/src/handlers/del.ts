/**
 * Delete notification handler.
 *
 * DELETE /notifications/:id — deletes a notification owned by the authenticated
 * user only.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { deleteNotification } from '@molecule/api-notification-center'

import { getSessionUserId } from '../utilities.js'

/**
 * Handles DELETE /notifications/:id requests.
 *
 * Requires an authenticated session and only deletes the requester's own
 * notification — a notification belonging to another user (or a non-existent
 * id) yields a 404, never deleting someone else's row (IDOR).
 *
 * @param req - Express request with notification id param.
 * @param res - Express response.
 */
export async function del(req: Request<{ id: string }>, res: Response): Promise<void> {
  const userId = getSessionUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const deleted = await deleteNotification(userId, req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Not Found' })
    return
  }

  res.status(204).end()
}
