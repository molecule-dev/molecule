/**
 * Delete notification handler.
 *
 * DELETE /notifications/:id — deletes a notification.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { deleteNotification } from '@molecule/api-notification-center'

/**
 * Handles DELETE /notifications/:id requests.
 *
 * @param req - Express request with notification id param.
 * @param res - Express response.
 */
export async function del(req: Request<{ id: string }>, res: Response): Promise<void> {
  await deleteNotification(req.params.id)
  res.status(204).end()
}
